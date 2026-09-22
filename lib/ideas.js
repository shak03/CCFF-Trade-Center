// Trade idea finder. Runs in the browser from the league data.
import { assetsOf } from './assets.js';
import { gradeTrade, directionOf, POSITIONS } from './grade.js';

const MIN_VALUE = 300; // ignore near-worthless assets
const B_MINUS = -2; // the other side must grade B- or better
const MY_GAIN = 0.5; // and the idea has to actually help you

const needsOf = (team, n) => POSITIONS.filter((p) => team.positions[p].starterRank > n / 2);

// Every 1-, 2- and 3-asset package from a list.
function packages(pool) {
  const out = [];
  for (let i = 0; i < pool.length; i++) {
    out.push([pool[i]]);
    for (let j = i + 1; j < pool.length; j++) {
      out.push([pool[i], pool[j]]);
      for (let k = j + 1; k < pool.length; k++) out.push([pool[i], pool[j], pool[k]]);
    }
  }
  return out;
}

export function findTradeIdeas({ me, teams, slots, listings = [] }) {
  const n = teams.length;
  const myDir = directionOf(me);
  const myNeeds = needsOf(me, n);
  const listed = new Set(listings.map((l) => `${l.rosterId}~${l.asset}`));

  // What I'd realistically send: bench players and picks. Rebuilders also sell
  // veterans but keep their 1sts.
  const givePool = assetsOf(me)
    .filter((a) => a.dyn >= MIN_VALUE)
    .filter((a) => {
      if (a.kind === 'pick') return myDir !== 'rebuilding' || a.round >= 2;
      if (myDir === 'rebuilding') return !a.starter || (a.age ?? 0) >= 27;
      return !a.starter;
    })
    .sort((a, b) => b.dyn - a.dyn)
    .slice(0, 12);
  const allPackages = packages(givePool);

  const ideas = [];
  for (const other of teams) {
    if (other.rosterId === me.rosterId) continue;
    const otherDir = directionOf(other);
    const theirNeeds = needsOf(other, n);

    // What they'd realistically send: anything on their block, bench players,
    // and a rebuilder's veterans. Contenders pay picks to rebuilders.
    const targets = assetsOf(other)
      .filter((a) => a.dyn >= MIN_VALUE)
      .filter((a) => {
        if (listed.has(`${other.rosterId}~${a.key}`)) return true;
        if (a.kind === 'pick') return myDir === 'rebuilding' && otherDir === 'contending';
        const available = !a.starter || (otherDir === 'rebuilding' && (a.age ?? 0) >= 26);
        if (!available) return false;
        if (myDir === 'rebuilding') return (a.age ?? 99) <= 25;
        return myNeeds.includes(a.pos);
      })
      .sort((a, b) => (myDir === 'rebuilding' ? b.dyn - a.dyn : b.now - a.now))
      .slice(0, 5);

    for (const target of targets) {
      // Packages priced near the target's market value, closest first.
      const priced = allPackages
        .map((pkg) => {
          const market = pkg.reduce((s, a) => s + a.dyn, 0);
          return { pkg, ratio: market / target.dyn };
        })
        .filter((x) => x.ratio >= 0.9 && x.ratio <= 1.35)
        .sort((x, y) => Math.abs(x.ratio - 1.05) + 0.08 * x.pkg.length - (Math.abs(y.ratio - 1.05) + 0.08 * y.pkg.length))
        .slice(0, 8);

      let best = null;
      for (const { pkg } of priced) {
        // Skip pointless swaps like a 2nd for a 2nd.
        if (target.kind === 'pick' && pkg.length === 1 && pkg[0].kind === 'pick' && pkg[0].round === target.round) continue;
        const result = gradeTrade({
          teamA: me,
          teamB: other,
          aGives: pkg.map((a) => a.key),
          bGives: [target.key],
          slots,
        });
        const floor = Math.min(result.a.score, result.b.score);
        if (result.a.score < MY_GAIN || result.b.score < B_MINUS) continue;
        if (!best || floor > best.floor) best = { pkg, result, floor };
      }
      if (!best) continue;

      const reasons = [];
      if (listed.has(`${other.rosterId}~${target.key}`)) reasons.push('They put it on the block');
      if (target.kind === 'player' && myNeeds.includes(target.pos) && myDir !== 'rebuilding')
        reasons.push(`Upgrades your ${target.pos}`);
      if (myDir === 'rebuilding' && target.kind === 'player') reasons.push('Young piece for your rebuild');
      if (myDir === 'rebuilding' && target.kind === 'pick') reasons.push('Contenders pay in picks');
      for (const pos of new Set(best.pkg.filter((a) => a.kind === 'player').map((a) => a.pos)))
        if (theirNeeds.includes(pos)) reasons.push(`Helps their ${pos}`);
      if (best.pkg.some((a) => a.kind === 'pick') && otherDir === 'rebuilding') reasons.push('Picks for a rebuilding team');

      const complementary =
        (myDir === 'contending' && otherDir === 'rebuilding') || (myDir === 'rebuilding' && otherDir === 'contending');
      ideas.push({
        partner: other,
        get: [target],
        give: best.pkg,
        result: best.result,
        reasons,
        fit: best.result.a.score + best.result.b.score + (complementary ? 1 : 0) + (reasons[0]?.startsWith('They put') ? 2 : 0),
      });
    }
  }

  // Best first, at most two ideas per trade partner.
  const perPartner = new Map();
  return ideas
    .sort((a, b) => b.fit - a.fit)
    .filter((idea) => {
      const count = perPartner.get(idea.partner.rosterId) || 0;
      perPartner.set(idea.partner.rosterId, count + 1);
      return count < 2;
    })
    .slice(0, 8);
}
