import { useMemo, useState } from 'react';
import TeamCard from './TeamCard.jsx';
import Board from './Board.jsx';

const SORTS = {
  winNow: { label: 'Win-now roster', fn: (a, b) => a.ranks.winNow - b.ranks.winNow },
  longTerm: { label: 'Long-term value', fn: (a, b) => a.ranks.longTerm - b.ranks.longTerm },
  youth: { label: 'Youngest core', fn: (a, b) => (a.ranks.youth ?? 99) - (b.ranks.youth ?? 99) },
  record: { label: 'Record', fn: (a, b) => b.record.w - a.record.w || b.record.pf - a.record.pf },
};

export default function Teams({ data }) {
  const [sort, setSort] = useState('winNow');
  const sorted = useMemo(() => [...data.teams].sort(SORTS[sort].fn), [data, sort]);

  return (
    <>
      <header className="masthead">
        <h1>Teams</h1>
        <p>Every roster sized up: who’s built to win now, who’s built for later, and where each team is thin.</p>
      </header>

      <Board teams={data.teams} />

      <div className="section-head">
        <h2>Rosters</h2>
        <label className="sort">
          <span>Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid">
        {sorted.map((team) => (
          <TeamCard key={team.rosterId} team={team} teamCount={data.league.teamCount} seasons={data.pickSeasons} />
        ))}
      </div>
    </>
  );
}
