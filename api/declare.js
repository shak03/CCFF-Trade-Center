import { COOLDOWN_DAYS, DIRECTIONS, LABELS } from '../lib/config.js';
import { requireRedis } from '../lib/store.js';
import { checkPin, isValidPin } from '../lib/pins.js';
import { httpError, sendError, appUrl, formatDate } from '../lib/http.js';
import { buildLeagueData } from '../lib/buildLeague.js';
import { postToDiscord, declarationPost } from '../lib/discord.js';

const DAY = 86_400_000;
const MAX_TRIES = 5;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    const db = requireRedis();
    const { rosterId, direction, pin } = req.body || {};
    const rid = String(rosterId ?? '');

    if (!rid) throw httpError(400, 'Pick a team.');
    if (!DIRECTIONS.includes(direction)) throw httpError(400, 'Pick Contending, Retooling, or Rebuilding.');
    if (!isValidPin(pin)) throw httpError(400, 'Enter your 4–8 digit PIN.');

    // PIN check with a lockout after repeated misses
    const failKey = `pinfail:${rid}`;
    const fails = Number(await db.get(failKey)) || 0;
    if (fails >= MAX_TRIES) throw httpError(429, 'Too many wrong PINs. Try again in 15 minutes.');

    const stored = await db.hget('pins', rid);
    if (!stored) throw httpError(400, 'This team doesn’t have a PIN yet. Ask the commissioner to set one.');
    if (!checkPin(pin, stored)) {
      await db.incr(failKey);
      await db.expire(failKey, 15 * 60);
      const left = MAX_TRIES - (fails + 1);
      throw httpError(
        401,
        left > 0
          ? `Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left before a 15-minute lockout.`
          : 'Wrong PIN. This team is locked for 15 minutes.',
      );
    }
    await db.del(failKey);

    // Cooldown and duplicate checks
    const current = await db.hget('directions', rid);
    if (current?.direction === direction) throw httpError(400, `You’re already declared as ${LABELS[direction]}.`);
    if (current && !current.cooldownCleared) {
      const until = current.declaredAt + COOLDOWN_DAYS * DAY;
      if (Date.now() < until) throw httpError(409, `You can switch again on ${formatDate(until)}.`);
    }

    const now = Date.now();
    const record = {
      direction,
      declaredAt: now,
      previous: current?.direction || null,
      history: [...(current?.history || []), { direction, at: now }].slice(-10),
    };
    await db.hset('directions', { [rid]: record });

    // Announce it. A failure here never undoes the declaration.
    let team = null;
    let discord = { posted: false, reason: 'Couldn’t load league data for the post' };
    try {
      const data = await buildLeagueData();
      team = data.teams.find((t) => String(t.rosterId) === rid) || null;
      if (team) {
        discord = await postToDiscord(declarationPost(team, record.previous, data.league.teamCount, appUrl(req)));
      }
    } catch {
      /* keep the default discord result */
    }

    res.status(200).json({ ok: true, team, discord });
  } catch (err) {
    sendError(res, err);
  }
}
