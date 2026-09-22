import { useState } from 'react';
import { api } from './api.js';
import { saveSession } from './session.js';

export default function Login({ data, onLogin }) {
  const [rosterId, setRosterId] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const teams = [...data.teams].sort((a, b) => a.manager.localeCompare(b.manager));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await api.login(Number(rosterId), pin);
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <header className="masthead">
        <h1>Log in</h1>
        <p>See your roster, put players and picks on the block, and find trades that fit.</p>
      </header>
      <form className="login-form" onSubmit={submit}>
        <label className="field">
          <span>Your team</span>
          <select value={rosterId} onChange={(e) => setRosterId(e.target.value)} required>
            <option value="" disabled>Pick your team</option>
            {teams.map((t) => (
              <option key={t.rosterId} value={t.rosterId}>{t.manager}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>PIN</span>
          <input
            className="pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            required
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy || !rosterId || pin.length < 4}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="fine-print">No PIN yet? Ask the commissioner.</p>
      </form>
    </div>
  );
}
