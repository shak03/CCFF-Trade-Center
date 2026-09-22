import { FUTURE_SEASONS, ROOKIE_ROUNDS, COOLDOWN_DAYS, MANAGER_NAMES } from './config.js';
import { POSITIONS, bestLineup } from './grade.js';

const DAY = 86_400_000;

const sum = (list, get) => list.reduce((total, x) => total + (get(x) || 0), 0);

function managerName(user) {
  if (!user) return 'Open team';
  const name = user.display_name || user.username || 'Unknown';
  const match = Object.entries(MANAGER_NAMES).find(([k]) => k.toLowerCase() === name.toLowerCase());
  return match ? match[1] : name;
}

// Map of rosterId -> rank, where 1 is the highest score.
function rankBy(teams, score) {
  const sorted = [...teams].sort((a, b) => score(b) - score(a));
  return new Map(sorted.map((t, i) => [t.rosterId, i + 1]));
}

// When FantasyCalc doesn't price a pick, estimate it from where picks usually
// trade relative to players: a future 1st ~ the 36th-60th most valuable player.
function estimatePickValues(allDynasty) {
  const sorted = allDynasty.filter((v) => v > 0).sort((a, b) => b - a);
  const band = (from, to) => {
    const slice = sorted.slice(from, to);
    return slice.length ? Math.round(slice.reduce((a, b) => a + b, 0) / slice.length) : 0;
  };
  return { 1: band(35, 60), 2: band(105, 135), 3: band(190, 230), 4: band(260, 300), later: band(320, 360) };
}

export function analyzeLeague({ league, users, rosters, tradedPicks, directory, values, directions, pinTeams }) {
  const n = rosters.length;
  const now = Date.now();
  const userById = new Map(users.map((u) => [u.user_id, u]));
  const slots = league.roster_positions || [];
  const season = Number(league.season);
  const valuesOk = Object.keys(values.players || {}).length > 0;
  const pickEstimates = estimatePickValues(Object.values(values.players || {}).map((p) => p.dyn));

  const managerByRoster = new Map(rosters.map((ro) => [ro.roster_id, managerName(userById.get(ro.owner_id))]));

  // ── Draft pick ownership ────────────────────────────────────────────────
  const pickSeasons = Array.from({ length: FUTURE_SEASONS }, (_, i) => String(season + 1 + i));
  const relevantTrades = tradedPicks.filter((tp) => pickSeasons.includes(String(tp.season)));
  const pickRounds = Math.max(ROOKIE_ROUNDS, ...relevantTrades.map((tp) => tp.round));
  const pickOwner = new Map();
  for (const s of pickSeasons)
    for (let r = 1; r <= pickRounds; r++)
      for (const ro of rosters) pickOwner.set(`${s}|${r}|${ro.roster_id}`, ro.roster_id);
  for (const tp of relevantTrades) {
    const key = `${tp.season}|${tp.round}|${tp.roster_id}`;
    if (pickOwner.has(key)) pickOwner.set(key, tp.owner_id);
  }

  // ── Per-team numbers ────────────────────────────────────────────────────
  const teams = rosters.map((ro) => {
    const user = userById.get(ro.owner_id);
    const players = (ro.players || []).map((id) => {
      const meta = directory[id] || {};
      const v = values.players?.[id] || {};
      return {
        id,
        name: meta.n || `Unknown player (${id})`,
        pos: meta.p || '?',
        team: meta.t || '',
        age: v.age ?? meta.a ?? null,
        dyn: v.dyn ?? 0,
        now: v.now ?? 0,
      };
    });

    const lineup = bestLineup(players, slots);
    const starterIds = new Set(lineup.map((p) => p.id));

    const picks = [];
    for (const [key, owner] of pickOwner) {
      if (owner !== ro.roster_id) continue;
      const [s, r, original] = key.split('|');
      const round = Number(r);
      const market = values.pickValues?.[`${s}|${r}`];
      picks.push({
        key: `pick:${key}`,
        season: s,
        round,
        fromRosterId: Number(original),
        fromManager: managerByRoster.get(Number(original)),
        ownerRosterId: ro.roster_id,
        value: market ?? pickEstimates[round] ?? pickEstimates.later,
        estimated: market == null,
      });
    }
    picks.sort((a, b) => a.season.localeCompare(b.season) || a.round - b.round);

    const byDynasty = [...players].sort((a, b) => b.dyn - a.dyn);
    const core = byDynasty.filter((p) => p.age != null && p.dyn > 0).slice(0, 8);

    const positions = {};
    for (const pos of POSITIONS) {
      const bench = players.filter((p) => p.pos === pos && !starterIds.has(p.id));
      positions[pos] = {
        starterValue: sum(lineup.filter((p) => p.pos === pos), (p) => p.now),
        benchValue: sum(bench, (p) => p.dyn),
        benchCount: bench.filter((p) => p.dyn > 0).length,
      };
    }

    const st = ro.settings || {};
    return {
      rosterId: ro.roster_id,
      manager: managerByRoster.get(ro.roster_id),
      teamName: user?.metadata?.team_name || null,
      record: {
        w: st.wins || 0,
        l: st.losses || 0,
        t: st.ties || 0,
        pf: (st.fpts || 0) + (st.fpts_decimal || 0) / 100,
      },
      winNow: Math.round(sum(lineup, (p) => p.now)),
      longTerm: Math.round(sum(players, (p) => p.dyn) + sum(picks, (p) => p.value)),
      coreAge: core.length ? sum(core, (p) => p.age) / core.length : null,
      positions,
      picks,
      roster: byDynasty.map((p) => ({ ...p, starter: starterIds.has(p.id) })),
      topAssets: byDynasty.slice(0, 3),
      pinSet: pinTeams.has(String(ro.roster_id)),
    };
  });

  // ── League-relative ranks and flags ─────────────────────────────────────
  const winNowRank = rankBy(teams, (t) => t.winNow);
  const longTermRank = rankBy(teams, (t) => t.longTerm);
  const youthRank = rankBy(teams.filter((t) => t.coreAge != null), (t) => -t.coreAge);
  const posRanks = Object.fromEntries(
    POSITIONS.map((pos) => [
      pos,
      {
        starter: rankBy(teams, (t) => t.positions[pos].starterValue),
        depth: rankBy(teams, (t) => t.positions[pos].benchValue),
      },
    ]),
  );

  const games = (t) => t.record.w + t.record.l + t.record.t;
  const winPct = (t) => (games(t) ? (t.record.w + t.record.t / 2) / games(t) : 0);
  const enoughGames = teams.every((t) => games(t) >= 3);
  const winPctRank = rankBy(teams, winPct);
  const pct = (rank) => (n > 1 ? 1 - (rank - 1) / (n - 1) : 1);
  const thinCutoff = Math.max(n - 3, Math.ceil(n / 2)); // bottom 3 in a 10-team league

  for (const t of teams) {
    t.ranks = {
      winNow: winNowRank.get(t.rosterId),
      longTerm: longTermRank.get(t.rosterId),
      youth: youthRank.get(t.rosterId) ?? null,
    };
    for (const pos of POSITIONS) {
      const p = t.positions[pos];
      p.starterRank = posRanks[pos].starter.get(t.rosterId);
      p.depthRank = posRanks[pos].depth.get(t.rosterId);
      p.thin = valuesOk && p.starterRank > thinCutoff;
      p.deep = valuesOk && p.depthRank <= 3 && p.benchCount > 0;
    }
    // Roster strength drives the suggestion; record counts once 3+ games are in.
    const recordRank = enoughGames ? winPctRank.get(t.rosterId) : t.ranks.winNow;
    t.score = 0.75 * pct(t.ranks.winNow) + 0.25 * pct(recordRank);
  }

  const tier = Math.max(1, Math.round(n * 0.3));
  [...teams]
    .sort((a, b) => b.score - a.score)
    .forEach((t, i) => {
      t.suggested = i < tier ? 'contending' : i >= n - tier ? 'rebuilding' : 'retooling';
    });

  // ── Declared directions ─────────────────────────────────────────────────
  for (const t of teams) {
    const rec = directions[String(t.rosterId)] || null;
    const until = rec && !rec.cooldownCleared ? rec.declaredAt + COOLDOWN_DAYS * DAY : null;
    t.direction = rec?.direction || null;
    t.declaredAt = rec?.declaredAt || null;
    t.canChangeAt = until && until > now ? until : null;
  }

  return { teams, slots, pickSeasons, pickRounds, valuesOk };
}
