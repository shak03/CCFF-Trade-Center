import { LABELS } from './config.js';

const COLORS = { contending: 0xe4a62b, retooling: 0x8e99ad, rebuilding: 0x2b9c8e };

export async function postToDiscord(payload) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return { posted: false, reason: 'No Discord webhook is set up yet' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'CCFF Trade Center', ...payload }),
    });
    if (!res.ok) return { posted: false, reason: `Discord returned ${res.status}` };
    return { posted: true };
  } catch (err) {
    return { posted: false, reason: err.message };
  }
}

export function declarationPost(team, previous, teamCount, url) {
  const label = LABELS[team.direction];
  const lines = [];
  if (previous) lines.push(`Switched from **${LABELS[previous]}**.`);

  if (team.suggested === team.direction) {
    lines.push('The numbers agree.');
  } else if (team.suggested === 'retooling') {
    lines.push('The numbers say stuck in the middle. We’ll see.');
  } else {
    lines.push(`The numbers say ${LABELS[team.suggested].toLowerCase()}. Bold move.`);
  }

  const thin = Object.entries(team.positions).filter(([, p]) => p.thin).map(([pos]) => pos);
  const fields = [
    { name: 'Win-now roster', value: `#${team.ranks.winNow} of ${teamCount}`, inline: true },
    { name: 'Long-term value', value: `#${team.ranks.longTerm} of ${teamCount}`, inline: true },
    { name: 'Core age', value: team.coreAge ? team.coreAge.toFixed(1) : 'n/a', inline: true },
  ];
  if (thin.length) fields.push({ name: 'Thin at', value: thin.join(', '), inline: false });

  return {
    embeds: [
      {
        title: `📣 ${team.manager} is officially ${label}`,
        url,
        description: lines.join('\n'),
        color: COLORS[team.direction],
        fields,
        footer: { text: 'CCFF Trade Center' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
