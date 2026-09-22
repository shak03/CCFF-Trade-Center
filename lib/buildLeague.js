import { LEAGUE_ID, COOLDOWN_DAYS } from './config.js';
import { getLeagueBundle, getPlayerDirectory } from './sleeper.js';
import { getValues, valueSettings } from './values.js';
import { readDirections, readPinTeams, redis } from './store.js';
import { analyzeLeague } from './analyze.js';

export async function buildLeagueData() {
  const { league, users, rosters, tradedPicks } = await getLeagueBundle(LEAGUE_ID);
  const settings = valueSettings(league);
  const neededIds = rosters.flatMap((r) => r.players || []);

  const [directory, values, directions, pinTeams] = await Promise.all([
    getPlayerDirectory(neededIds),
    getValues(settings),
    readDirections(),
    readPinTeams(),
  ]);

  const analysis = analyzeLeague({ league, users, rosters, tradedPicks, directory, values, directions, pinTeams });

  return {
    league: { name: league.name, season: league.season, teamCount: rosters.length, cooldownDays: COOLDOWN_DAYS },
    ...analysis,
    values: {
      fetchedAt: values.fetchedAt,
      stale: values.stale,
      error: values.error || null,
      settings,
    },
    dbConnected: Boolean(redis),
    generatedAt: new Date().toISOString(),
  };
}
