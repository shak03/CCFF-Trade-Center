import crypto from 'node:crypto';
import { requireRedis } from './store.js';
import { checkPin, isValidPin } from './pins.js';
import { httpError } from './http.js';

const MAX_TRIES = 5;
const SESSION_DAYS = 60;

// PIN check with a 15-minute lockout after 5 misses.
export async function verifyPin(db, rid, pin) {
  if (!isValidPin(pin)) throw httpError(400, 'Enter your 4–8 digit PIN.');
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
}

// Sessions carry the team's "session version"; resetting a PIN bumps it,
// which logs that team out everywhere.
export async function createSession(db, rid) {
  const token = crypto.randomBytes(24).toString('hex');
  const v = Number(await db.get(`sessver:${rid}`)) || 0;
  await db.set(`session:${token}`, { rid: String(rid), v }, { ex: SESSION_DAYS * 86400 });
  return token;
}

export async function requireSession(req) {
  const db = requireRedis();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!/^[a-f0-9]{48}$/.test(token)) throw httpError(401, 'Log in to do that.');
  const session = await db.get(`session:${token}`);
  if (!session) throw httpError(401, 'Your login expired. Log in again.');
  const v = Number(await db.get(`sessver:${session.rid}`)) || 0;
  if (session.v !== v) throw httpError(401, 'Your PIN was reset. Log in again.');
  return { db, rid: String(session.rid), token };
}
