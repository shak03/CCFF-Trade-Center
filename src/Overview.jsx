import { useState } from 'react';
import { api } from './api.js';
import { findAsset } from '../lib/assets.js';
import { DIRECTIONS, ordinal, age, num, timeAgo } from './labels.js';
import Board from './Board.jsx';

const FILTERS = ['All', 'QB', 'RB', 'WR', 'TE', 'Picks'];

export default function Overview({ data, session, reload, notify, onError }) {
  const [filter, setFilter] = useState('All');
  const [busy, setBusy] = useState(null);
  const teamById = new Map(data.teams.map((t) => [t.rosterId, t]));

  const listings = data.listings
    .map((l) => {
      const owner = teamById.get(l.rosterId);
      return { ...l, owner, item: owner && findAsset(owner, l.asset) };
    })
    .filter((l) => l.item)
    .filter((l) => filter === 'All' || (filter === 'Picks' ? l.item.kind === 'pick' : l.item.pos === filter));

  async function toggleInterest(listing) {
    setBusy(listing.id);
    try {
      const result = await api.block({ action: 'interest', listingId: listing.id });
      await reload();
      if (!result.interested) notify('Took back your interest.');
      else if (result.discord?.posted) notify('Interest sent. Posted to Discord.');
      else notify('Interest saved.');
    } catch (err) {
      onError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <header className="masthead">
        <h1>Trade block</h1>
        <p>
          {data.listings.length === 0
            ? 'Nothing listed yet.'
            : `${data.listings.length} ${data.listings.length === 1 ? 'player or pick' : 'players and picks'} available across ${data.league.name}.`}{' '}
          Hit “I’m interested” and the league hears about it.
        </p>
      </header>

      <div className="filters" role="radiogroup" aria-label="Filter the block">
        {FILTERS.map((f) => (
          <button key={f} role="radio" aria-checked={filter === f} className={filter === f ? 'filter is-on' : 'filter'} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="empty">
          <p>{data.listings.length === 0 ? 'The block is empty. Be the first to shop someone.' : `No ${filter === 'Picks' ? 'picks' : filter + 's'} on the block right now.`}</p>
          {data.listings.length === 0 && (
            <a className="btn btn-primary" href="#/team">{session ? 'List a player or pick' : 'Log in to list a player'}</a>
          )}
        </div>
      ) : (
        <div className="listing-grid">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              teamById={teamById}
              session={session}
              busy={busy === l.id}
              onInterest={() => toggleInterest(l)}
            />
          ))}
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Where teams are headed</h2>
        </div>
        <Board teams={data.teams} compact />
      </section>
    </>
  );
}

function ListingCard({ listing, teamById, session, busy, onInterest }) {
  const { owner, item } = listing;
  const tone = owner.direction || 'undeclared';
  const mine = session?.rosterId === owner.rosterId;
  const iAmIn = session && listing.interested.includes(session.rosterId);
  const fans = listing.interested.map((id) => teamById.get(id)?.manager).filter(Boolean);

  return (
    <article className={`listing tone-${tone}`}>
      <div className="card-stripe" aria-hidden="true" />
      <div className="listing-body">
        <div className="listing-top">
          <span className="pos-badge">{item.kind === 'pick' ? 'Pick' : item.pos}</span>
          <span className="listing-age">{timeAgo(listing.listedAt)}</span>
        </div>

        <h3>{item.kind === 'pick' ? `${item.season} ${ordinal(item.round)}` : item.name}</h3>
        <p className="listing-meta">
          {item.kind === 'pick'
            ? item.fromRosterId === owner.rosterId
              ? 'Their own pick'
              : `Originally ${item.fromManager}’s`
            : [item.team, item.age != null && `age ${age(item.age)}`].filter(Boolean).join(', ')}
          {item.dyn > 0 && <span className="value-note">Market value {num(item.dyn)}</span>}
        </p>

        <div className="listing-owner">
          <span>{owner.manager}</span>
          {owner.direction ? (
            <span className="dir-pill">{DIRECTIONS[owner.direction].label}</span>
          ) : (
            <span className="dir-pill dir-pill-open">Undeclared</span>
          )}
        </div>

        {listing.note && (
          <p className="listing-note">
            <span>Looking for</span> {listing.note}
          </p>
        )}

        <footer className="listing-foot">
          <span className="fans">{fans.length ? `👀 ${fans.join(', ')}` : 'No interest yet'}</span>
          {mine ? (
            <span className="own-tag">Your listing</span>
          ) : session ? (
            <button className={iAmIn ? 'btn btn-quiet' : 'btn'} aria-pressed={Boolean(iAmIn)} disabled={busy} onClick={onInterest}>
              {busy ? 'Saving…' : iAmIn ? 'Interested ✓' : 'I’m interested'}
            </button>
          ) : (
            <a className="btn" href="#/team">Log in to show interest</a>
          )}
        </footer>
      </div>
    </article>
  );
}
