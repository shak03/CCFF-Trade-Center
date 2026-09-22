import { useState } from 'react';
import { api } from './api.js';
import { assetLabel } from '../lib/assets.js';
import Modal from './Modal.jsx';

export default function ListModal({ item, existing, onClose, onDone }) {
  const [note, setNote] = useState(existing?.note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.block({ action: 'add', asset: item.key, note });
      onDone(result, Boolean(existing));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={existing ? 'Edit your listing' : 'Put on the block'} onClose={onClose}>
      <p className="modal-asset">{assetLabel(item)}</p>
      <form onSubmit={submit}>
        <label className="field">
          <span>What are you looking for? (optional)</span>
          <textarea
            rows={3}
            maxLength={140}
            placeholder="e.g. RB2 and a 2027 2nd"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <span className="counter">{note.length}/140</span>
        </label>
        {!existing && <p className="modal-sub">Listing it posts to Discord.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : existing ? 'Save note' : 'Put on the block'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
