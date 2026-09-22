import { LEAGUE_ID, COOLDOWN_DAYS } from './config.js';
import { getLeagueBundle, getPlayerDirectory } from './sleeper.js';
import { getValues, valueSettings } from './values.js';
import { readDirections, readPinTeams, readBlock, redis } from './store.js';
import { analyzeLeague } from './analyze.js';
import { findAsset } from './assets.js';

export async function buildLeagueData() {
  const { league, users, rosters, tradedPicks } = await getLeagueBundle(LEAGUE_ID);
  const settings = valueSettings(league);
  const neededIds = rosters.flatMap((r) => r.players || []);

  const [directory, values, directions, pinTeams, block] = await Promise.all([
    getPlayerDirectory(neededIds),
    getValues(settings),
    readDirections(),
    readPinTeams(),
    readBlock(),
  ]);

  const analysis = analyzeLeague({ league, users, rosters, tradedPicks, directory, values, directions, pinTeams });

  // Keep only listings whose player or pick is still on that team's roster.
  const listings = [];
  const gone = [];
  for (const [id, rec] of Object.entries(block)) {
    const team = analysis.teams.find((t) => String(t.rosterId) === String(rec.rosterId));
    if (!team || !findAsset(team, rec.asset)) {
      gone.push(id);
      continue;
    }
    listings.push({
      id,
      rosterId: team.rosterId,
      asset: rec.asset,
      note: rec.note || '',
      listedAt: rec.listedAt,
      interested: (rec.interested || []).map(Number),
    });
  }
  if (gone.length && redis) await redis.hdel('block', ...gone).catch(() => {});
  listings.sort((a, b) => b.listedAt - a.listedAt);

  return {
    league: { name: league.name, season: league.season, teamCount: rosters.length, cooldownDays: COOLDOWN_DAYS },
    ...analysis,
    listings,
    values: { fetchedAt: values.fetchedAt, stale: values.stale, error: values.error || null, settings },
    dbConnected: Boolean(redis),
    generatedAt: new Date().toISOString(),
  };
}
