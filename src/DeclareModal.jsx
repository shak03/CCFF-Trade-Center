import { useState } from 'react';
import { api } from './api.js';
import { DIRECTION_KEYS, DIRECTIONS, SUGGESTED } from './labels.js';
import Modal from './Modal.jsx';

export default function DeclareModal({ team, cooldownDays, onClose, onDeclared }) {
  const [choice, setChoice] = useState(team.direction ? null : team.suggested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.declare(choice);
      onDeclared(result, choice);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Where is your team headed?" onClose={onClose}>
      <p className="modal-sub">
        It gets posted to Discord, and you can’t switch again for {cooldownDays} days. The numbers say you’re{' '}
        {SUGGESTED[team.suggested]}.
      </p>
      <div className="choices" role="radiogroup" aria-label="Direction">
        {DIRECTION_KEYS.map((key) => {
          const current = team.direction === key;
          return (
            <button
              type="button"
              key={key}
              role="radio"
              aria-checked={choice === key}
              disabled={current}
              className={`choice tone-${key} ${choice === key ? 'is-picked' : ''}`}
              onClick={() => setChoice(key)}
            >
              <span className="choice-label">{DIRECTIONS[key].label}</span>
              <span className="choice-blurb">{current ? 'Your current direction' : DIRECTIONS[key].blurb}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy || !choice} onClick={submit}>
          {busy ? 'Declaring…' : choice ? `Declare ${DIRECTIONS[choice].label}` : 'Declare'}
        </button>
      </div>
    </Modal>
  );
}
