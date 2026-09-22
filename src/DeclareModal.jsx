import { useEffect, useRef, useState } from 'react';
import { declareDirection } from './api.js';
import { DIRECTION_KEYS, DIRECTIONS, SUGGESTED } from './labels.js';

export default function DeclareModal({ team, cooldownDays, onClose, onDeclared }) {
  const [choice, setChoice] = useState(team.direction ? null : team.suggested);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.querySelector('button:not([disabled])')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!choice) return setError('Pick a direction first.');
    setBusy(true);
    setError(null);
    try {
      const result = await declareDirection({ rosterId: team.rosterId, direction: choice, pin });
      onDeclared(result, choice);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="declare-title" ref={dialogRef}>
        <h2 id="declare-title">Where is {team.manager} headed?</h2>
        <p className="modal-sub">
          Your choice gets posted to Discord, and you can’t switch again for {cooldownDays} days. The numbers say you’re{' '}
          {SUGGESTED[team.suggested]}.
        </p>

        {!team.pinSet && (
          <p className="notice">This team doesn’t have a PIN yet. Ask the commissioner to set one.</p>
        )}

        <form onSubmit={submit}>
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

          <label className="field">
            <span>Your PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !choice || pin.length < 4}>
              {busy ? 'Declaring…' : choice ? `Declare ${DIRECTIONS[choice].label}` : 'Declare'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
