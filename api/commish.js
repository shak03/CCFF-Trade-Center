import { DIRECTIONS } from '../lib/config.js';
import { redis, requireRedis } from '../lib/store.js';
import { hashPin, isValidPin, safeEqual } from '../lib/pins.js';
import { httpError, sendError } from '../lib/http.js';
import { postToDiscord } from '../lib/discord.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    const expected = process.env.COMMISH_KEY;
    if (!expected) {
      throw httpError(503, 'Add a COMMISH_KEY environment variable in Vercel, then redeploy.');
    }
    const { key, action, rosterId, pin, direction } = req.body || {};
    if (!safeEqual(key || '', expected)) throw httpError(401, 'Wrong commissioner key.');

    if (action === 'status') {
      return res.json({ ok: true, dbConnected: Boolean(redis), discordConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL) });
    }

    if (action === 'testDiscord') {
      const result = await postToDiscord({ content: '✅ The CCFF Trade Center is connected to this channel.' });
      if (!result.posted) throw httpError(502, `Test post failed: ${result.reason}.`);
      return res.json({ ok: true });
    }

    const db = requireRedis();
    const rid = String(rosterId ?? '');
    if (!rid) throw httpError(400, 'Pick a team.');

    if (action === 'setPin') {
      if (!isValidPin(pin)) throw httpError(400, 'PINs are 4–8 digits.');
      await db.hset('pins', { [rid]: hashPin(pin) });
      await db.del(`pinfail:${rid}`);
      return res.json({ ok: true });
    }

    if (action === 'setDirection') {
      if (!direction) {
        await db.hdel('directions', rid);
        return res.json({ ok: true });
      }
      if (!DIRECTIONS.includes(direction)) throw httpError(400, 'Unknown direction.');
      const current = await db.hget('directions', rid);
      const now = Date.now();
      await db.hset('directions', {
        [rid]: {
          direction,
          declaredAt: now,
          previous: current?.direction || null,
          history: [...(current?.history || []), { direction, at: now, byCommish: true }].slice(-10),
          cooldownCleared: true,
        },
      });
      return res.json({ ok: true });
    }

    if (action === 'clearCooldown') {
      const current = await db.hget('directions', rid);
      if (!current) throw httpError(400, 'This team hasn’t declared, so there’s no cooldown to clear.');
      await db.hset('directions', { [rid]: { ...current, cooldownCleared: true } });
      return res.json({ ok: true });
    }

    throw httpError(400, 'Unknown action.');
  } catch (err) {
    sendError(res, err);
  }
}
