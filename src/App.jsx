import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { getSession, clearSession } from './session.js';
import Overview from './Overview.jsx';
import Teams from './Teams.jsx';
import MyTeam from './MyTeam.jsx';
import Login from './Login.jsx';
import Commish from './Commish.jsx';

function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('commish')) return 'commish';
  if (hash.startsWith('teams')) return 'teams';
  if (hash.startsWith('team')) return 'team';
  return 'block';
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(parseRoute);
  const [session, setSession] = useState(getSession);
  const [toast, setToast] = useState(null);

  const load = useCallback(
    (fresh = false) =>
      api
        .league(fresh)
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e.message)),
    [],
  );

  const logout = useCallback(() => {
    api.logout().catch(() => {});
    clearSession();
    setSession(null);
  }, []);

  // Any 401 from a logged-in action means the login is no longer good.
  const handleError = useCallback(
    (err) => {
      if (err.status === 401) {
        logout();
        setToast(`${err.message}`);
      } else {
        setToast(err.message);
      }
    },
    [logout],
  );

  useEffect(() => {
    load();
    if (getSession()) api.me().catch((err) => err.status === 401 && logout());
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [load, logout]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const myTeam = data && session ? data.teams.find((t) => t.rosterId === session.rosterId) : null;
  const shared = { data, session, myTeam, reload: () => load(true), notify: setToast, onError: handleError };

  return (
    <>
      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          <a href="#/" className="brand">CCFF Trade Center</a>
          <div className="nav-links">
            <a href="#/" aria-current={route === 'block' ? 'page' : undefined}>Trade block</a>
            <a href="#/teams" aria-current={route === 'teams' ? 'page' : undefined}>Teams</a>
            <a href="#/team" aria-current={route === 'team' ? 'page' : undefined}>
              {myTeam ? 'My team' : 'Log in'}
            </a>
          </div>
          {myTeam && (
            <div className="nav-user">
              <span>{myTeam.manager}</span>
              <button className="link-btn" onClick={logout}>Log out</button>
            </div>
          )}
        </div>
      </nav>

      <main className="wrap">
        {error && (
          <p className="banner banner-error" role="alert">
            Couldn’t load league data: {error} Refresh the page to try again.
          </p>
        )}
        {data && !data.valuesOk && (
          <p className="banner">Player values are unavailable right now, so ranks, grades and trade ideas are off. Everything else works.</p>
        )}

        {route === 'commish' ? (
          <Commish data={data} reload={() => load(true)} />
        ) : !data ? (
          !error && <p className="loading">Pulling rosters from Sleeper…</p>
        ) : route === 'teams' ? (
          <Teams data={data} />
        ) : route === 'team' ? (
          myTeam ? <MyTeam {...shared} team={myTeam} /> : <Login data={data} onLogin={setSession} />
        ) : (
          <Overview {...shared} />
        )}

        {data && (
          <footer className="site-foot">
            <p>
              {data.values.fetchedAt
                ? `Player values from FantasyCalc, updated ${new Date(data.values.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${
                    data.values.stale ? ' (couldn’t refresh today, showing the last good copy)' : ''
                  }.`
                : 'Player values from FantasyCalc.'}{' '}
              Unpriced draft picks use estimated values.
            </p>
            <a href="#/commish">Commissioner tools</a>
          </footer>
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
