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

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const shortDate = (ms) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const age = (a) => (a == null ? '' : Math.floor(a));
