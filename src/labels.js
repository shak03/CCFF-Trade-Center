export { ordinal } from '../lib/assets.js';

export const DIRECTION_KEYS = ['contending', 'retooling', 'rebuilding'];

export const DIRECTIONS = {
  contending: { label: 'Contending', blurb: 'Buying starters to win now.' },
  retooling: { label: 'Retooling', blurb: 'Open to deals in both directions.' },
  rebuilding: { label: 'Rebuilding', blurb: 'Selling veterans for youth and picks.' },
};

// What the data calls a team before its manager declares.
export const SUGGESTED = {
  contending: 'a contender',
  retooling: 'stuck in the middle',
  rebuilding: 'a rebuilder',
};

export const POSITIONS = ['QB', 'RB', 'WR', 'TE'];

export const shortDate = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const age = (a) => (a == null ? '' : Math.floor(a));

export const num = (v) => Math.round(v || 0).toLocaleString('en-US');

export function timeAgo(ms) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export const pct = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;
