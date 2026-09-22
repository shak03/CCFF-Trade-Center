import { POSITIONS, ordinal } from './labels.js';

export function StatRow({ team }) {
  return (
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
  );
}

export function PositionStrip({ team, teamCount }) {
  return (
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
  );
}
