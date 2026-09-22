import { DIRECTIONS, num, pct } from './labels.js';

export const gradeTone = (g) => (g.startsWith('A') ? 'good' : g.startsWith('B') ? 'mid' : 'bad');

export function GradeBadge({ grade, small = false }) {
  return <span className={`grade grade-${gradeTone(grade)} ${small ? 'grade-sm' : ''}`}>{grade}</span>;
}

// Shows exactly how a side's grade was reached.
export default function GradeCard({ team, side, receives }) {
  const w = side.weights;
  return (
    <section className="grade-card">
      <header>
        <div>
          <h3>{team.manager}</h3>
          <p>
            Graded as {DIRECTIONS[side.direction].label.toLowerCase()}
            {!team.direction && ' (the data’s guess, not declared)'}
          </p>
        </div>
        <GradeBadge grade={side.grade} />
      </header>
      <dl className="grade-lines">
        <div>
          <dt>Win-now lineup</dt>
          <dd>
            {num(side.now.before)} → {num(side.now.after)} <strong>{pct(side.now.pct)}</strong>
          </dd>
        </div>
        <div>
          <dt>Long-term core{side.direction === 'rebuilding' ? ', youth-weighted' : ''}</dt>
          <dd>
            {num(side.long.before)} → {num(side.long.after)} <strong>{pct(side.long.pct)}</strong>
          </dd>
        </div>
        <div>
          <dt>Weighted {Math.round(w.now * 100)}/{Math.round(w.long * 100)}</dt>
          <dd>
            <strong>{side.score >= 0 ? '+' : '−'}{Math.abs(side.score).toFixed(2)}</strong>
          </dd>
        </div>
        <div>
          <dt>Market value</dt>
          <dd>
            Sends {num(side.market)}, gets {num(receives)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
