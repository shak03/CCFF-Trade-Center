import { cacheGet, cacheSet } from './store.js';

// FantasyCalc values come from millions of real trades. There's no official
// documented API, so we cache daily and keep the last good copy as a fallback.
const FANTASYCALC = 'https://api.fantasycalc.com/values/current';

export function valueSettings(league) {
  const slots = league.roster_positions || [];
  const qbSlots = slots.filter((s) => s === 'QB').length;
  const rec = league.scoring_settings?.rec ?? 1;
  return {
    numQbs: slots.includes('SUPER_FLEX') || qbSlots >= 2 ? 2 : 1,
    numTeams: league.total_rosters || 10,
    ppr: rec >= 1 ? 1 : rec >= 0.5 ? 0.5 : 0,
  };
}

async function fetchValues(settings, isDynasty) {
  const qs = new URLSearchParams({
    isDynasty: String(isDynasty),
    numQbs: String(settings.numQbs),
    numTeams: String(settings.numTeams),
    ppr: String(settings.ppr),
  });
  const res = await fetch(`${FANTASYCALC}?${qs}`);
  if (!res.ok) throw new Error(`FantasyCalc returned ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('FantasyCalc returned no values');
  return rows;
}

// Pick names look like "2027 1st", "2027 Mid 1st" or "2026 Pick 1.04".
function parsePick(name = '') {
  let m = name.match(/(\d{4})\s+Pick\s+(\d+)\.\d+/i);
  if (m) return { season: m[1], round: Number(m[2]) };
  m = name.match(/(\d{4}).*?\b(\d)(st|nd|rd|th)\b/i);
  if (m) return { season: m[1], round: Number(m[2]) };
  return null;
}

export async function getValues(settings) {
  const tag = `${settings.numQbs}qb-${settings.numTeams}t-${settings.ppr}ppr`;
  const freshKey = `fc:fresh:${tag}`;
  const lastGoodKey = `fc:last:${tag}`;

  const fresh = await cacheGet(freshKey);
  if (fresh) return { ...fresh, stale: false };

  try {
    const rows = await fetchValues(settings, true);
    const players = {};
    const pickBuckets = {};

    for (const row of rows) {
      const p = row.player || {};
      if (p.position === 'PICK') {
        const pick = parsePick(p.name);
        if (pick) (pickBuckets[`${pick.season}|${pick.round}`] ||= []).push(row.value || 0);
        continue;
      }
      if (!p.sleeperId) continue;
      players[p.sleeperId] = {
        dyn: row.value ?? 0,
        now: row.redraftValue ?? null,
        age: p.maybeAge ?? null,
      };
    }

    // If the dynasty feed didn't include redraft values, fetch them separately.
    if (!Object.values(players).some((p) => p.now != null)) {
      const redraftRows = await fetchValues(settings, false);
      for (const row of redraftRows) {
        const id = row.player?.sleeperId;
        if (id && players[id]) players[id].now = row.value ?? 0;
      }
    }

    const pickValues = {};
    for (const [key, list] of Object.entries(pickBuckets)) {
      pickValues[key] = Math.round(list.reduce((a, b) => a + b, 0) / list.length);
    }

    const data = { players, pickValues, fetchedAt: new Date().toISOString() };
    await cacheSet(freshKey, data, 24 * 3600);
    await cacheSet(lastGoodKey, data);
    return { ...data, stale: false };
  } catch (err) {
    const lastGood = await cacheGet(lastGoodKey);
    if (lastGood) return { ...lastGood, stale: true, error: err.message };
    return { players: {}, pickValues: {}, fetchedAt: null, stale: true, error: err.message };
  }
}
