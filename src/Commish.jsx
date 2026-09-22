import { useState } from 'react';
import { commishAction } from './api.js';
import { DIRECTION_KEYS, DIRECTIONS, shortDate } from './labels.js';

const randomPin = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0');

export default function Commish({ data, reload }) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState(null);
  const [pins, setPins] = useState({});
  const [dirs, setDirs] = useState({});
  const [busy, setBusy] = useState(false);

  async function run(payload, success) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await commishAction({ key, ...payload });
      if (success) setMessage({ ok: true, text: success });
      return result;
    } catch (err) {
      setMessage({ ok: false, text: err.message });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function unlock(e) {
    e.preventDefault();
    const result = await run({ action: 'status' });
    if (result) setStatus(result);
  }

  async function savePin(team) {
    const pin = pins[team.rosterId] || '';
    const ok = await run({ action: 'setPin', rosterId: team.rosterId, pin }, `PIN saved for ${team.manager}. Send it to them privately.`);
    if (ok) reload();
  }

  async function saveDirection(team) {
    const direction = dirs[team.rosterId] ?? team.direction ?? '';
    const label = direction ? DIRECTIONS[direction].label : 'undeclared';
    const ok = await run({ action: 'setDirection', rosterId: team.rosterId, direction: direction || null }, `${team.manager} set to ${label}.`);
    if (ok) reload();
  }

  async function clearCooldown(team) {
    const ok = await run({ action: 'clearCooldown', rosterId: team.rosterId }, `${team.manager} can switch direction now.`);
    if (ok) reload();
  }

  return (
    <div className="wrap commish">
      <header className="masthead">
        <h1>Commissioner tools</h1>
        <p>
          <a href="#">Back to the Trade Center</a>
        </p>
      </header>

      {!status ? (
        <form className="unlock" onSubmit={unlock}>
          <label className="field">
            <span>Commissioner key</span>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="current-password" required />
          </label>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
          {message && !message.ok && <p className="form-error" role="alert">{message.text}</p>}
        </form>
      ) : (
        <>
          <section className="checks">
            <p className={status.dbConnected ? 'check ok' : 'check bad'}>
              {status.dbConnected ? 'Database connected.' : 'Database not connected. Add Upstash Redis in Vercel’s Storage tab.'}
            </p>
            <p className={status.discordConfigured ? 'check ok' : 'check bad'}>
              {status.discordConfigured ? 'Discord webhook set.' : 'No Discord webhook. Add DISCORD_WEBHOOK_URL in Vercel.'}
            </p>
            <button className="btn" disabled={busy || !status.discordConfigured} onClick={() => run({ action: 'testDiscord' }, 'Test post sent. Check your channel.')}>
              Send a test post to Discord
            </button>
          </section>

          {message && (
            <p className={message.ok ? 'banner banner-ok' : 'banner banner-error'} role="status">
              {message.text}
            </p>
          )}

          {!data && <p className="loading">Loading teams…</p>}

          {data && (
            <ul className="commish-list">
              {data.teams
                .slice()
                .sort((a, b) => a.manager.localeCompare(b.manager))
                .map((team) => (
                  <li key={team.rosterId} className="commish-row">
                    <div className="commish-team">
                      <strong>{team.manager}</strong>
                      <span>{team.pinSet ? 'PIN set' : 'No PIN yet'}</span>
                    </div>

                    <div className="commish-group">
                      <input
                        aria-label={`New PIN for ${team.manager}`}
                        placeholder="4–8 digits"
                        inputMode="numeric"
                        maxLength={8}
                        value={pins[team.rosterId] || ''}
                        onChange={(e) => setPins({ ...pins, [team.rosterId]: e.target.value.replace(/\D/g, '') })}
                      />
                      <button className="btn btn-quiet" onClick={() => setPins({ ...pins, [team.rosterId]: randomPin() })}>
                        Generate
                      </button>
                      <button className="btn" disabled={busy || (pins[team.rosterId] || '').length < 4} onClick={() => savePin(team)}>
                        Save PIN
                      </button>
                    </div>

                    <div className="commish-group">
                      <select
                        aria-label={`Direction for ${team.manager}`}
                        value={dirs[team.rosterId] ?? team.direction ?? ''}
                        onChange={(e) => setDirs({ ...dirs, [team.rosterId]: e.target.value })}
                      >
                        <option value="">Undeclared</option>
                        {DIRECTION_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {DIRECTIONS[k].label}
                          </option>
                        ))}
                      </select>
                      <button className="btn" disabled={busy} onClick={() => saveDirection(team)}>
                        Set direction
                      </button>
                      {team.canChangeAt && (
                        <button className="btn btn-quiet" disabled={busy} onClick={() => clearCooldown(team)}>
                          Clear cooldown (until {shortDate(team.canChangeAt)})
                        </button>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}
          <p className="fine-print">Directions you set here skip the cooldown and aren’t posted to Discord.</p>
        </>
      )}
    </div>
  );
}
