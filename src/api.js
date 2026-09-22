import { getSession } from './session.js';

async function call(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const session = getSession();
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // `fresh` skips the 30-second CDN cache right after a change.
  league: (fresh) => call(fresh ? `/api/league?fresh=${Date.now()}` : '/api/league'),
  login: (rosterId, pin) => call('/api/session', { method: 'POST', body: { rosterId, pin } }),
  me: () => call('/api/session'),
  logout: () => call('/api/session', { method: 'DELETE' }),
  declare: (direction) => call('/api/declare', { method: 'POST', body: { direction } }),
  block: (payload) => call('/api/block', { method: 'POST', body: payload }),
  commish: (payload) => call('/api/commish', { method: 'POST', body: payload }),
};
