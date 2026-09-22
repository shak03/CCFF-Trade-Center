import { DIRECTION_KEYS, DIRECTIONS } from './labels.js';

// Every team sits in its declared column, or in the column the data suggests
// (shown as a dashed "undeclared" plate) until its manager declares.
export default function Board({ teams, compact = false }) {
  return (
    <section className={compact ? 'board board-compact' : 'board'} aria-label="Where every team is headed">
      {DIRECTION_KEYS.map((key, col) => {
        const plates = teams
          .filter((t) => (t.direction || t.suggested) === key)
          .sort((a, b) => Boolean(b.direction) - Boolean(a.direction) || a.ranks.winNow - b.ranks.winNow);
        return (
          <div className={`board-col tone-${key}`} key={key} style={{ '--col': col }}>
            <h3>{DIRECTIONS[key].label}</h3>
            {!compact && <p className="col-blurb">{DIRECTIONS[key].blurb}</p>}
            {plates.length === 0 ? (
              <p className="col-empty">Nobody yet.</p>
            ) : (
              <ul>
                {plates.map((t, i) => (
                  <li key={t.rosterId} className={t.direction ? 'plate' : 'plate plate-undeclared'} style={{ '--i': i }}>
                    <span className="plate-name">{t.manager}</span>
                    {!t.direction && <span className="plate-note">Undeclared</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
