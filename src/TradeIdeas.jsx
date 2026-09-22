import { useMemo } from 'react';
import { findTradeIdeas } from '../lib/ideas.js';
import { DIRECTIONS } from './labels.js';
import { directionOf } from '../lib/grade.js';
import AssetLine from './AssetLine.jsx';
import { GradeBadge } from './GradeCard.jsx';

export default function TradeIdeas({ me, data, onOpen }) {
  const ideas = useMemo(
    () => (data.valuesOk ? findTradeIdeas({ me, teams: data.teams, slots: data.slots, listings: data.listings }) : []),
    [me, data],
  );

  return (
    <section role="tabpanel" aria-label="Trade ideas">
      <p className="tab-intro">
        Built from each team’s needs and direction. Every idea helps you and grades at least a B- for the other team, so
        it’s worth sending in Sleeper. You’re graded as {DIRECTIONS[directionOf(me)].label.toLowerCase()}
        {!me.direction && ' (the data’s guess until you declare)'}.
      </p>

      {ideas.length === 0 ? (
        <div className="empty">
          <p>No clean fits right now. Try the calculator, or put someone on the block so other teams come to you.</p>
        </div>
      ) : (
        <div className="ideas">
          {ideas.map((idea, i) => (
            <article className="idea" key={i}>
              <header className="idea-head">
                <h3>With {idea.partner.manager}</h3>
                <span className="dir-pill">{DIRECTIONS[directionOf(idea.partner)].label}</span>
              </header>
              <div className="idea-sides">
                <div>
                  <p className="subhead">You get</p>
                  <ul className="asset-list">
                    {idea.get.map((a) => <AssetLine key={a.key} asset={a} ownerId={idea.partner.rosterId} />)}
                  </ul>
                </div>
                <div>
                  <p className="subhead">You send</p>
                  <ul className="asset-list">
                    {idea.give.map((a) => <AssetLine key={a.key} asset={a} ownerId={me.rosterId} />)}
                  </ul>
                </div>
              </div>
              <p className="idea-why">{idea.reasons.join('. ')}.</p>
              <footer className="idea-foot">
                <span className="idea-grades">
                  You <GradeBadge grade={idea.result.a.grade} small /> Them <GradeBadge grade={idea.result.b.grade} small />
                </span>
                <button className="btn btn-small" onClick={() => onOpen(idea)}>Open in calculator</button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
