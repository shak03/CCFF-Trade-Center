import { requireRedis } from '../lib/store.js';
import { verifyPin, createSession, requireSession } from '../lib/auth.js';
import { httpError, sendError } from '../lib/http.js';

// POST = log in, GET = check the current login, DELETE = log out.
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const db = requireRedis();
      const { rosterId, pin } = req.body || {};
      const rid = String(rosterId ?? '');
      if (!rid) throw httpError(400, 'Pick your team.');
      await verifyPin(db, rid, pin);
      const token = await createSession(db, rid);
      return res.json({ token, rosterId: Number(rid) });
    }
    if (req.method === 'GET') {
      const { rid } = await requireSession(req);
      return res.json({ rosterId: Number(rid) });
    }
    if (req.method === 'DELETE') {
      const session = await requireSession(req).catch(() => null);
      if (session) await session.db.del(`session:${session.token}`);
      return res.json({ ok: true });
    }
    res.status(405).json({ error: 'Unsupported method.' });
  } catch (err) {
    sendError(res, err);
  }
}
