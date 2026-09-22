import { useState } from 'react';
import { api } from './api.js';
import { assetsOf } from '../lib/assets.js';
import { DIRECTIONS, SUGGESTED, shortDate, num, age } from './labels.js';
import { StatRow, PositionStrip } from './TeamProfile.jsx';
import { assetName } from './AssetLine.jsx';
import DeclareModal from './DeclareModal.jsx';
import ListModal from './ListModal.jsx';
import TradeIdeas from './TradeIdeas.jsx';
import Calculator from './Calculator.jsx';

const TABS = [
  ['roster', 'Roster and picks'],
  ['ideas', 'Trade ideas'],
  ['calc', 'Trade calculator'],
];

export default function MyTeam({ data, team, reload, notify, onError }) {
  const [tab, setTab] = useState('roster');
  const [declaring, setDeclaring] = useState(false);
  const [listing, setListing] = useState(null);
  const [seed, setSeed] = useState(null);
  const [busy, setBusy] = useState(null);

  const teamById = new Map(data.teams.map((t) => [t.rosterId, t]));
  const myListings = new Map(data.listings.filter((l) => l.rosterId === team.rosterId).map((l) => [l.asset, l]));
  const assets = assetsOf(team);
  const starters = assets.filter((a) => a.kind === 'player' && a.starter);
  const bench = assets.filter((a) => a.kind === 'player' && !a.starter);
  const picks = assets.filter((a) => a.kind === 'pick');
  const interestCount = [...myListings.values()].reduce((s, l) => s + l.interested.length, 0);

  async function remove(l) {
    setBusy(l.id);
    try {
      await api.block({ action: 'remove', listingId: l.id });
      await reload();
      notify('Taken off the block.');
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
    }
  }

  async function listed(result, wasEdit) {
    setListing(null);
    await reload();
    if (wasEdit) notify('Note updated.');
    else notify(result.discord?.posted ? 'On the block. Posted to Discord.' : `On the block. The Discord post didn’t go through: ${result.discord?.reason}.`);
  }

  async function declared(result, direction) {
    setDeclaring(false);
    await reload();
    const label = DIRECTIONS[direction].label;
    notify(result.discord?.posted ? `Declared ${label}. Posted to Discord.` : `Declared ${label}.`);
  }

  function openInCalculator(idea) {
    setSeed({ partnerId: idea.partner.rosterId, give: idea.give.map((a) => a.key), get: idea.get.map((a) => a.key) });
    setTab('calc');
  }

  const rows = (list) =>
    list.map((a) => {
      const l = myListings.get(a.key);
      const fans = l ? l.interested.map((id) => teamById.get(id)?.manager).filter(Boolean) : [];
      return (
        <tr key={a.key} className={l ? 'is-listed' : ''}>
          <td>
            <span className="asset-name">{assetName(a)}</span>
            {l && <span className="block-tag">On the block</span>}
            {fans.length > 0 && <span className="fan-line">👀 {fans.join(', ')}</span>}
          </td>
          <td>{a.kind === 'pick' ? (a.fromRosterId === team.rosterId ? 'Own' : `via ${a.fromManager}`) : a.pos}</td>
          <td>{a.kind === 'pick' ? '' : a.team}</td>
          <td>{a.kind === 'pick' ? '' : age(a.age)}</td>
          <td className="num">{a.kind === 'pick' ? '–' : num(a.now)}</td>
          <td className="num">{num(a.dyn)}{a.estimated && <span title="Estimated value">*</span>}</td>
          <td className="actions">
            {l ? (
              <>
                <button className="btn btn-small btn-quiet" onClick={() => setListing({ item: a, existing: l })}>Edit note</button>
                <button className="btn btn-small btn-quiet" disabled={busy === l.id} onClick={() => remove(l)}>Remove</button>
              </>
            ) : (
              <button className="btn btn-small" onClick={() => setListing({ item: a })}>Add to block</button>
            )}
          </td>
        </tr>
      );
    });

  const table = (title, list) =>
    list.length > 0 && (
      <div className="table-wrap">
        <table className="roster">
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{title === 'Draft picks' ? 'Pick' : 'Player'}</th>
              <th scope="col">{title === 'Draft picks' ? 'From' : 'Pos'}</th>
              <th scope="col">Team</th>
              <th scope="col">Age</th>
              <th scope="col" className="num">Win-now</th>
              <th scope="col" className="num">Dynasty</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>{rows(list)}</tbody>
        </table>
      </div>
    );

  return (
    <>
      <header className={`team-head tone-${team.direction || 'undeclared'}`}>
        <div>
          <h1>{team.manager}</h1>
          {team.teamName && <p className="team-name-lg">{team.teamName}</p>}
          <div className="dir-line">
            {team.direction ? (
              <span className="dir-pill">{DIRECTIONS[team.direction].label}</span>
            ) : (
              <>
                <span className="dir-pill dir-pill-open">Undeclared</span>
                <span className="dir-hint">The numbers say {SUGGESTED[team.suggested]}.</span>
              </>
            )}
            {team.canChangeAt ? (
              <span className="dir-hint">Can switch again {shortDate(team.canChangeAt)}</span>
            ) : (
              <button className="btn btn-small btn-primary" onClick={() => setDeclaring(true)}>
                {team.direction ? 'Change direction' : 'Declare direction'}
              </button>
            )}
          </div>
        </div>
        <div className="team-head-side">
          <StatRow team={team} />
          <PositionStrip team={team} teamCount={data.league.teamCount} />
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="My team">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'tab is-on' : 'tab'} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'roster' && (
        <section role="tabpanel" aria-label="Roster and picks">
          <p className="tab-intro">
            {myListings.size === 0
              ? 'Nothing on the block yet. Add a player or pick and it posts to Discord.'
              : `${myListings.size} on the block${interestCount ? `, ${interestCount} ${interestCount === 1 ? 'team' : 'teams'} interested` : ''}.`}{' '}
            Values from FantasyCalc; * marks an estimated pick value.
          </p>
          {table('Starters', starters)}
          {table('Bench', bench)}
          {table('Draft picks', picks)}
        </section>
      )}
      {tab === 'ideas' && <TradeIdeas me={team} data={data} onOpen={openInCalculator} />}
      {tab === 'calc' && <Calculator key={JSON.stringify(seed)} me={team} data={data} seed={seed} />}

      {declaring && (
        <DeclareModal team={team} cooldownDays={data.league.cooldownDays} onClose={() => setDeclaring(false)} onDeclared={declared} />
      )}
      {listing && <ListModal item={listing.item} existing={listing.existing} onClose={() => setListing(null)} onDone={listed} />}
    </>
  );
}
