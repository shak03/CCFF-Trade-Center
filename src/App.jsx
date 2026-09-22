import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLeague } from './api.js';
import { DIRECTIONS, shortDate } from './labels.js';
import Board from './Board.jsx';
import TeamCard from './TeamCard.jsx';
import DeclareModal from './DeclareModal.jsx';
import Commish from './Commish.jsx';

const SORTS = {
  winNow: { label: 'Win-now roster', fn: (a, b) => a.ranks.winNow - b.ranks.winNow },
  longTerm: { label: 'Long-term value', fn: (a, b) => a.ranks.longTerm - b.ranks.longTerm },
  youth: { label: 'Youngest core', fn: (a, b) => (a.ranks.youth ?? 99) - (b.ranks.youth ?? 99) },
  record: { label: 'Record', fn: (a, b) => b.record.w - a.record.w || b.record.pf - a.record.pf },
};

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(window.location.hash);
  const [declaring, setDeclaring] = useState(null);
  const [toast, setToast] = useState(null);
  const [sort, setSort] = useState('winNow');

  const load = useCallback(
    () =>
      getLeague()
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e.message)),
    [],
  );

  useEffect(() => {
    load();
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const sorted = useMemo(() => (data ? [...data.teams].sort(SORTS[sort].fn) : []), [data, sort]);

  function handleDeclared({ team, discord }, direction) {
    setDeclaring(null);
    if (team) {
      setData((d) => ({ ...d, teams: d.teams.map((t) => (t.rosterId === team.rosterId ? team : t)) }));
    } else {
      load();
    }
    const label = DIRECTIONS[direction].label;
    setToast(
      discord.posted
        ? `Declared ${label}. Posted to Discord.`
        : `Declared ${label}. The Discord post didn’t go through: ${discord.reason}.`,
    );
  }

  if (route === '#commish') return <Commish data={data} reload={load} />;

  return (
    <div className="wrap">
      <header className="masthead">
        <h1>Trade Center</h1>
        <p>
          {data ? `${data.league.name}, ${data.league.season} season.` : 'Loading your league…'} Declare where your
          team is headed, then go find a deal.
        </p>
      </header>

      {error && (
        <p className="banner banner-error" role="alert">
          Couldn’t load league data: {error} Refresh the page to try again.
        </p>
      )}

      {data && !data.valuesOk && (
        <p className="banner">
          Player values are unavailable right now, so ranks and thin spots are hidden. Everything else still works.
        </p>
      )}

      {data && (
        <>
          <Board teams={data.teams} />

          <div className="section-head">
            <h2>Teams</h2>
            <label className="sort">
              <span>Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([key, s]) => (
                  <option key={key} value={key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid">
            {sorted.map((team) => (
              <TeamCard
                key={team.rosterId}
                team={team}
                teamCount={data.league.teamCount}
                seasons={data.pickSeasons}
                onDeclare={setDeclaring}
              />
            ))}
          </div>

          <footer className="site-foot">
            <p>
              {data.values.fetchedAt
                ? `Player values from FantasyCalc, updated ${shortDate(Date.parse(data.values.fetchedAt))}${
                    data.values.stale ? ' (couldn’t refresh today, showing the last good copy)' : ''
                  }.`
                : 'Player values from FantasyCalc.'}{' '}
              Gold pick chips were acquired from another team.
            </p>
            <a href="#commish">Commissioner tools</a>
          </footer>
        </>
      )}

      {!data && !error && <p className="loading">Pulling rosters from Sleeper…</p>}

      {declaring && <DeclareModal team={declaring} cooldownDays={data?.league.cooldownDays ?? 21} onClose={() => setDeclaring(null)} onDeclared={handleDeclared} />}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
