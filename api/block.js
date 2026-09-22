import { requireSession } from '../lib/auth.js';
import { httpError, sendError, appUrl } from '../lib/http.js';
import { buildLeagueData } from '../lib/buildLeague.js';
import { findAsset } from '../lib/assets.js';
import { postToDiscord, blockPost, interestPost } from '../lib/discord.js';

const MAX_LISTINGS = 10;
const NOTE_LIMIT = 140;

// Actions: add (or update the note on) a listing, remove one, or toggle interest.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    const { db, rid } = await requireSession(req);
    const { action, asset, note, listingId } = req.body || {};
    const data = await buildLeagueData();
    const me = data.teams.find((t) => String(t.rosterId) === rid);
    if (!me) throw httpError(404, 'Your team wasn’t found in the league.');

    if (action === 'add') {
      const item = findAsset(me, String(asset || ''));
      if (!item) throw httpError(400, 'That player or pick isn’t on your roster anymore.');
      const id = `${rid}~${item.key}`;
      const existing = await db.hget('block', id);
      if (!existing && data.listings.filter((l) => String(l.rosterId) === rid).length >= MAX_LISTINGS) {
        throw httpError(400, `You can have ${MAX_LISTINGS} things on the block at once. Remove one first.`);
      }
      const record = {
        rosterId: Number(rid),
        asset: item.key,
        note: String(note || '').trim().slice(0, NOTE_LIMIT),
        listedAt: existing?.listedAt || Date.now(),
        interested: existing?.interested || [],
        pinged: existing?.pinged || [],
      };
      await db.hset('block', { [id]: record });
      const discord = existing
        ? { posted: false, reason: 'Note updated, no new post' }
        : await postToDiscord(blockPost(me, item, record.note, appUrl(req)));
      return res.json({ ok: true, discord });
    }

    if (action === 'remove') {
      const id = String(listingId || '');
      if (!id.startsWith(`${rid}~`)) throw httpError(403, 'You can only remove your own listings.');
      await db.hdel('block', id);
      return res.json({ ok: true });
    }

    if (action === 'interest') {
      const id = String(listingId || '');
      const rec = await db.hget('block', id);
      if (!rec) throw httpError(404, 'That listing is gone. It may have been traded or taken down.');
      if (String(rec.rosterId) === rid) throw httpError(400, 'That’s your own listing.');

      const interested = new Set((rec.interested || []).map(String));
      const pinged = new Set((rec.pinged || []).map(String));
      const nowInterested = !interested.has(rid);
      if (nowInterested) interested.add(rid);
      else interested.delete(rid);

      // Post only the first time a team shows interest in a listing.
      let discord = null;
      if (nowInterested && !pinged.has(rid)) {
        pinged.add(rid);
        const owner = data.teams.find((t) => String(t.rosterId) === String(rec.rosterId));
        const item = owner && findAsset(owner, rec.asset);
        if (item) discord = await postToDiscord(interestPost(me, owner, item));
      }

      await db.hset('block', {
        [id]: { ...rec, interested: [...interested].map(Number), pinged: [...pinged].map(Number) },
      });
      return res.json({ ok: true, interested: nowInterested, discord });
    }

    throw httpError(400, 'Unknown action.');
  } catch (err) {
    sendError(res, err);
  }
}
