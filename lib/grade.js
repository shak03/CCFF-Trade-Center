// Trade math, shared by the server and the browser. No Node-only imports here.
import { assetsOf } from './assets.js';

export const POSITIONS = ['QB', 'RB', 'WR', 'TE'];

export const SLOT_ELIGIBLE = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  FLEX: ['RB', 'WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  REC_FLEX: ['WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
};

// How much each direction cares about this season vs. the long run.
export const WEIGHTS = {
  contending: { now: 0.7, long: 0.3 },
  retooling: { now: 0.5, long: 0.5 },
  rebuilding: { now: 0.3, long: 0.7 },
};

// Weighted % change in team strength -> letter grade.
// One trade moves a whole team a few percent, so the bands are tight: B = within ±1%.
const GRADE_FLOORS = [
  [5, 'A+'],
  [3, 'A'],
  [2, 'A-'],
  [1, 'B+'],
  [-1, 'B'],
  [-2, 'B-'],
  [-3, 'C+'],
  [-4.5, 'C'],
  [-6.5, 'D'],
];

export function letterGrade(score) {
  for (const [floor, grade] of GRADE_FLOORS) if (score >= floor) return grade;
  return 'F';
}

export const directionOf = (team) => team.direction || team.suggested || 'retooling';

// Fill the most restrictive lineup slots first with the best win-now player available.
export function bestLineup(players, slots) {
  const open = slots
    .filter((s) => SLOT_ELIGIBLE[s])
    .sort((a, b) => SLOT_ELIGIBLE[a].length - SLOT_ELIGIBLE[b].length);
  const pool = [...players].sort((a, b) => b.now - a.now);
  const used = new Set();
  const lineup = [];
  for (const slot of open) {
    const pick = pool.find((p) => !used.has(p.id) && SLOT_ELIGIBLE[slot].includes(p.pos));
    if (pick) {
      used.add(pick.id);
      lineup.push({ slot, ...pick });
    }
  }
  return lineup;
}

// Win-now strength: redraft value of the best possible starting lineup.
export function lineupValue(players, slots) {
  return bestLineup(players, slots).reduce((sum, p) => sum + p.now, 0);
}

// Long-term strength: dynasty value of the top N players plus every pick.
// N = 1.75x the starting slots, so depth past a real roster's worth adds nothing.
// That stops "three okay players for one star" from grading as a win.
export function coreDepth(slots) {
  return Math.max(1, Math.round(slots.filter((s) => SLOT_ELIGIBLE[s]).length * 1.75));
}

// Rebuilders care about who'll still be good in 2–3 years, so from their side
// players over 25 lose 7% of their long-term value per year, down to half.
export function youthFactor(age, direction) {
  if (direction !== 'rebuilding' || age == null || age <= 25) return 1;
  return Math.max(0.5, 1 - 0.07 * (age - 25));
}

export function coreValue(players, picks, slots, direction = 'retooling') {
  const top = players
    .map((p) => p.dyn * youthFactor(p.age, direction))
    .sort((a, b) => b - a)
    .slice(0, coreDepth(slots));
  return top.reduce((a, b) => a + b, 0) + picks.reduce((s, p) => s + (p.value || 0), 0);
}

const pctChange = (before, after) => (before > 0 ? ((after - before) / before) * 100 : 0);

function evaluateSide(team, giveKeys, received, slots) {
  const give = new Set(giveKeys);
  const players = team.roster.filter((p) => !give.has(p.id));
  const picks = team.picks.filter((p) => !give.has(p.key));
  for (const a of received) (a.kind === 'pick' ? picks : players).push(a);

  const nowBefore = lineupValue(team.roster, slots);
  const nowAfter = lineupValue(players, slots);
  const direction = directionOf(team);
  const longBefore = coreValue(team.roster, team.picks, slots, direction);
  const longAfter = coreValue(players, picks, slots, direction);

  const weights = WEIGHTS[direction];
  const now = { before: nowBefore, after: nowAfter, pct: pctChange(nowBefore, nowAfter) };
  const long = { before: longBefore, after: longAfter, pct: pctChange(longBefore, longAfter) };
  const score = weights.now * now.pct + weights.long * long.pct;

  return { direction, weights, now, long, score, grade: letterGrade(score) };
}

// aGives / bGives are lists of asset keys.
export function gradeTrade({ teamA, teamB, aGives, bGives, slots }) {
  const aAssets = assetsOf(teamA);
  const bAssets = assetsOf(teamB);
  const pickOut = (assets, keys) => keys.map((k) => assets.find((a) => a.key === k)).filter(Boolean);
  const aSends = pickOut(aAssets, aGives);
  const bSends = pickOut(bAssets, bGives);
  return {
    a: { ...evaluateSide(teamA, aGives, bSends, slots), market: aSends.reduce((s, x) => s + x.dyn, 0) },
    b: { ...evaluateSide(teamB, bGives, aSends, slots), market: bSends.reduce((s, x) => s + x.dyn, 0) },
  };
}
