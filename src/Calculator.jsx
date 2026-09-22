import { useMemo, useState } from 'react';
import { assetsOf } from '../lib/assets.js';
import { gradeTrade } from '../lib/grade.js';
import { num } from './labels.js';
import { assetName, assetMeta } from './AssetLine.jsx';
import GradeCard from './GradeCard.jsx';

function Picker({ title, team, selected, onToggle }) {
  const assets = assetsOf(team)
    .filter((a) => a.dyn > 0)
    .sort((a, b) => (a.kind === b.kind ? b.dyn - a.dyn : a.kind === 'player' ? -1 : 1));
  const total = assets.filter((a) => selected.has(a.key)).reduce((s, a) => s + a.dyn, 0);

  return (
    <fieldset className="picker">
      <legend>
        {title} <span className="picker-total">{num(total)}</span>
      </legend>
      <ul>
        {assets.map((a) => (
          <li key={a.key}>
            <label className={selected.has(a.key) ? 'pick-row is-on' : 'pick-row'}>
              <input type="checkbox" checked={selected.has(a.key)} onChange={() => onToggle(a.key)} />
              <span className="asset-name">{assetName(a)}</span>
              <span className="asset-meta">{assetMeta(a, team.rosterId)}</span>
              <span className="asset-value">{num(a.dyn)}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export default function Calculator({ me, data, seed }) {
  const others = data.teams.filter((t) => t.rosterId !== me.rosterId).sort((a, b) => a.manager.localeCompare(b.manager));
  const [partnerId, setPartnerId] = useState(seed?.partnerId ?? '');
  const [give, setGive] = useState(() => new Set(seed?.give || []));
  const [get, setGet] = useState(() => new Set(seed?.get || []));
  const partner = others.find((t) => t.rosterId === Number(partnerId));

  const toggle = (setter) => (key) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const result = useMemo(
    () =>
      partner && data.valuesOk && (give.size || get.size)
        ? gradeTrade({ teamA: me, teamB: partner, aGives: [...give], bGives: [...get], slots: data.slots })
        : null,
    [partner, give, get, me, data],
  );

  return (
    <section role="tabpanel" aria-label="Trade calculator">
      <p className="tab-intro">
        Build a deal and see how it grades for both teams before you send it in Sleeper. Each side is judged by its own
        direction: contenders weigh this season 70/30, rebuilders weigh the future 70/30 and discount players over 25.
      </p>

      <label className="field partner-field">
        <span>Trade with</span>
        <select
          value={partnerId}
          onChange={(e) => {
            setPartnerId(e.target.value);
            setGet(new Set());
          }}
        >
          <option value="" disabled>Pick a team</option>
          {others.map((t) => (
            <option key={t.rosterId} value={t.rosterId}>{t.manager}</option>
          ))}
        </select>
      </label>

      {partner && (
        <>
          {result ? (
            <div className="grade-pair">
              <GradeCard team={me} side={result.a} receives={result.b.market} />
              <GradeCard team={partner} side={result.b} receives={result.a.market} />
            </div>
          ) : (
            <p className="empty">Check players or picks on either side to see the grades.</p>
          )}
          <div className="pickers">
            <Picker title="You send" team={me} selected={give} onToggle={toggle(setGive)} />
            <Picker title={`${partner.manager} sends`} team={partner} selected={get} onToggle={toggle(setGet)} />
          </div>
        </>
      )}
    </section>
  );
}
