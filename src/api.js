async function call(path, options) {
  const res = await fetch(path, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status}).`);
  return body;
}

const post = (path, payload) =>
  call(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const getLeague = () => call('/api/league');
export const declareDirection = (payload) => post('/api/declare', payload);
export const commishAction = (payload) => post('/api/commish', payload);
