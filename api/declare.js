import { COOLDOWN_DAYS, DIRECTIONS, LABELS } from '../lib/config.js';
import { requireSession } from '../lib/auth.js';
import { httpError, sendError, appUrl, formatDate } from '../lib/http.js';
import { buildLeagueData } from '../lib/buildLeague.js';
import { postToDiscord, declarationPost } from '../lib/discord.js';

const DAY = 86_400_000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    const { db, rid } = await requireSession(req);
    const { direction } = req.body || {};
    if (!DIRECTIONS.includes(direction)) throw httpError(400, 'Pick Contending, Retooling, or Rebuilding.');

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
    let discord = { posted: false, reason: 'Couldn’t load league data for the post' };
    try {
      const data = await buildLeagueData();
      const team = data.teams.find((t) => String(t.rosterId) === rid);
      if (team) discord = await postToDiscord(declarationPost(team, record.previous, data.league.teamCount, appUrl(req)));
    } catch {
      /* keep the default discord result */
    }

    res.status(200).json({ ok: true, discord });
  } catch (err) {
    sendError(res, err);
  }
}
