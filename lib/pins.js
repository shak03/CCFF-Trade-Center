import crypto from 'node:crypto';

// PINs are never stored as-is: each gets its own salt and a scrypt hash.
export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function checkPin(pin, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const attempt = crypto.scryptSync(String(pin), salt, 32);
  const known = Buffer.from(hash, 'hex');
  return known.length === attempt.length && crypto.timingSafeEqual(known, attempt);
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const isValidPin = (pin) => /^\d{4,8}$/.test(String(pin ?? ''));
