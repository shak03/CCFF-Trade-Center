// ─── League settings you might want to tweak ────────────────────────────────

export const LEAGUE_ID = process.env.LEAGUE_ID || '1398034562679869441';

// How many future rookie-draft seasons to show (Sleeper normally allows 3).
export const FUTURE_SEASONS = 3;

// Rounds in your rookie draft. If a traded pick shows a later round, that wins.
export const ROOKIE_ROUNDS = 4;

// Days a manager must wait before switching direction again.
export const COOLDOWN_DAYS = 21;

// Optional: show real names instead of Sleeper usernames.
// Left side = Sleeper display name (not case-sensitive), right side = name to show.
export const MANAGER_NAMES = {
  Shak03: 'Josh Ishak',
  joeywey: 'Joey Wey',
  Jpeeler0: 'Jack Peeler',
  Bryjuan11: 'Bryson Oaks',
  cadehoff: 'Cade Hoffman',
  emobley: 'Evan Mobley',
  jhoffff: 'Jace Hoffman',
  Aidank2247: 'Aidan Kraf',
  brettmobley: 'Brett Mobley',
  Lilb15: 'Cooper Barno',
};

// ─── Don't change below this line ───────────────────────────────────────────

export const DIRECTIONS = ['contending', 'retooling', 'rebuilding'];

export const LABELS = {
  contending: 'Contending',
  retooling: 'Retooling',
  rebuilding: 'Rebuilding',
};
