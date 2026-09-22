import { cacheGet, cacheSet } from './store.js';

const BASE = 'https://api.sleeper.app/v1';
const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);
const DIRECTORY_KEY = 'sleeper:players:v2';
const HOUR = 3_600_000;

async function sleeperGet(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`Sleeper ${path} returned ${res.status}`);
  return res.json();
}

export async function getLeagueBundle(leagueId) {
  const [league, users, rosters, tradedPicks] = await Promise.all([
    sleeperGet(`/league/${leagueId}`),
    sleeperGet(`/league/${leagueId}/users`),
    sleeperGet(`/league/${leagueId}/rosters`),
    sleeperGet(`/league/${leagueId}/traded_picks`),
  ]);
  return { league, users, rosters, tradedPicks };
}

// Sleeper's full player list is ~5 MB and they ask that it be fetched at most
// once a day, so we keep a trimmed copy (names, positions, teams, ages).
export async function getPlayerDirectory(neededIds) {
  let directory = await cacheGet(DIRECTORY_KEY);
  const age = directory ? Date.now() - directory.fetchedAt : Infinity;
  const missing = directory ? neededIds.some((id) => !directory.players[id]) : true;

  if (age > 24 * HOUR || (missing && age > HOUR)) {
    try {
      const all = await sleeperGet('/players/nfl');
      const needed = new Set(neededIds);
      const players = {};
      for (const [id, p] of Object.entries(all)) {
        if (!needed.has(id) && !(p.team && FANTASY_POSITIONS.has(p.position))) continue;
        players[id] = {
          n:
            p.position === 'DEF'
              ? `${p.team || id} D/ST`
              : p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' '),
          p: p.position || '?',
          t: p.team || 'FA',
          a: p.age ?? null,
        };
      }
      directory = { players, fetchedAt: Date.now() };
      await cacheSet(DIRECTORY_KEY, directory, 7 * 24 * 3600);
    } catch {
      if (!directory) directory = { players: {}, fetchedAt: 0 };
    }
  }
  return directory.players;
}
