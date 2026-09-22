// Shared by the server and the browser. No Node-only imports here.

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Every tradeable thing a team owns, in one shape.
// Players keep their Sleeper id as `key`; picks use "pick:SEASON|ROUND|ORIGINAL_ROSTER".
export function assetsOf(team) {
  return [
    ...team.roster.map((p) => ({ ...p, key: p.id, kind: 'player' })),
    ...team.picks.map((p) => ({ ...p, kind: 'pick', dyn: p.value || 0, now: 0, pos: 'PICK' })),
  ];
}

export function findAsset(team, key) {
  return assetsOf(team).find((a) => a.key === key) || null;
}

export function assetLabel(asset) {
  if (asset.kind === 'pick') {
    const own = asset.fromRosterId === asset.ownerRosterId;
    return `${asset.season} ${ordinal(asset.round)}${own ? '' : ` (from ${asset.fromManager})`}`;
  }
  const bits = [asset.pos, asset.team, asset.age != null ? Math.floor(asset.age) : null].filter(Boolean);
  return `${asset.name} (${bits.join(', ')})`;
}
