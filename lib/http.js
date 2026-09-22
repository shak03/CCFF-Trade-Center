export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function sendError(res, err) {
  const status = err.status || 500;
  const message = err.status ? err.message : `Something broke on the server: ${err.message}`;
  res.status(status).json({ error: message });
}

export function appUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `https://${host}` : undefined;
}

export function formatDate(ms) {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}
