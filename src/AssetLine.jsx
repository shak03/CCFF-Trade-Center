import { ordinal, age, num } from './labels.js';

export function assetName(a) {
  return a.kind === 'pick' ? `${a.season} ${ordinal(a.round)}` : a.name;
}

export function assetMeta(a, ownerId) {
  if (a.kind === 'pick') return a.fromRosterId === ownerId ? 'Own pick' : `from ${a.fromManager}`;
  return [a.pos, a.team, a.age != null && `age ${age(a.age)}`].filter(Boolean).join(', ');
}

export default function AssetLine({ asset, ownerId }) {
  return (
    <li className="asset-line">
      <span className="asset-name">{assetName(asset)}</span>
      <span className="asset-meta">{assetMeta(asset, ownerId)}</span>
      <span className="asset-value">{num(asset.dyn)}</span>
    </li>
  );
}
