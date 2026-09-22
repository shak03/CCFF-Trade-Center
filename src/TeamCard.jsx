import { DIRECTIONS, SUGGESTED, POSITIONS, ordinal, shortDate, age } from './labels.js';

export default function TeamCard({ team, teamCount, seasons, onDeclare }) {
  const tone = team.direction || 'undeclared';
  const record = `${team.record.w}–${team.record.l}${team.record.t ? `–${team.record.t}` : ''}`;

  return (
    <article className={`card tone-${tone}`}>
      <div className="card-stripe" aria-hidden="true" />
      <div className="card-body">
        <header className="card-head">
          <div>
            <h3>{team.manager}</h3>
            {team.teamName && <p className="team-name">{team.teamName}</p>}
          </div>
          <span className="record" aria-label={`Record ${record}`}>{record}</span>
        </header>

        <div className="dir-line">
          {team.direction ? (
            <span className="dir-pill">{DIRECTIONS[team.direction].label}</span>
          ) : (
            <>
              <span className="dir-pill dir-pill-open">Undeclared</span>
              <span className="dir-hint">The numbers say {SUGGESTED[team.suggested]}.</span>
            </>
          )}
        </div>

        <dl className="stats">
          <div>
            <dt>Win-now roster</dt>
            <dd>#{team.ranks.winNow}</dd>
          </div>
          <div>
            <dt>Long-term value</dt>
            <dd>#{team.ranks.longTerm}</dd>
          </div>
          <div>
            <dt>Core age</dt>
            <dd>{team.coreAge ? team.coreAge.toFixed(1) : '–'}</dd>
          </div>
        </dl>

        <div>
          <p className="subhead">Starters by position, league rank</p>
          <ul className="pos-strip">
            {POSITIONS.map((pos) => {
              const p = team.positions[pos];
              const state = p.thin ? 'thin' : p.deep ? 'deep' : '';
              return (
                <li
                  key={pos}
                  className={`pos ${state}`}
                  title={`${pos} starters rank ${ordinal(p.starterRank)} of ${teamCount}; bench depth ranks ${ordinal(p.depthRank)}`}
                >
                  <span className="pos-name">{pos}</span>
                  <span className="pos-rank">#{p.starterRank}</span>
                  {state && <span className="pos-tag">{p.thin ? 'Thin' : 'Deep bench'}</span>}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="subhead">Most valuable players</p>
          <ol className="assets">
            {team.topAssets.map((p) => (
              <li key={p.id}>
                <span className="asset-name">{p.name}</span>
                <span className="asset-meta">
                  {p.pos} {p.team}
                  {p.age != null && `, ${age(p.age)}`}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="subhead">Draft picks</p>
          {seasons.map((season) => {
            const picks = team.picks.filter((p) => p.season === season);
            return (
              <div className="picks-row" key={season}>
                <span className="season">{season}</span>
                {picks.length === 0 && <span className="no-picks">None</span>}
                {picks.map((p) => {
                  const own = p.fromRosterId === team.rosterId;
                  const label = own ? `Own ${ordinal(p.round)}` : `${ordinal(p.round)} from ${p.fromManager}`;
                  return (
                    <span key={`${p.round}-${p.fromRosterId}`} className={own ? 'chip' : 'chip chip-acquired'} title={label} aria-label={label}>
                      {p.round}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>

        <footer className="card-foot">
          {team.canChangeAt ? (
            <span className="lock-note">Can switch again {shortDate(team.canChangeAt)}</span>
          ) : (
            <span />
          )}
          <button className="btn" onClick={() => onDeclare(team)} disabled={Boolean(team.canChangeAt)}>
            {team.direction ? 'Change direction' : 'Declare direction'}
          </button>
        </footer>
      </div>
    </article>
  );
}
