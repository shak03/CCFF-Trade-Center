# CCFF Trade Center (Step 1: team directions)

Shows every team's win-now strength, long-term value, core age, thin and deep
positions, and future draft picks. Managers declare Contending, Retooling, or
Rebuilding with a PIN, and each declaration posts to Discord.

## Setup (one time, about 10 minutes)

1. **GitHub.** Make a new repo and upload everything in this folder to the repo's
   top level (so `package.json` sits at the root, not inside a subfolder).
2. **Vercel.** Add New → Project → import the repo. Vercel detects Vite on its own.
   Deploy.
3. **Database.** In the Vercel project, open **Storage** → Create Database →
   **Upstash for Redis** (free plan) → connect it to this project.
4. **Discord webhook.** In Discord: your trade channel → Edit Channel →
   Integrations → Webhooks → New Webhook → Copy Webhook URL.
5. **Environment variables.** Vercel → Settings → Environment Variables, add:
   - `DISCORD_WEBHOOK_URL`: the URL from step 4
   - `COMMISH_KEY`: a password only you know
6. **Redeploy** (Deployments → ⋯ → Redeploy) so the new settings take effect.
7. Open the site → **Commissioner tools** at the bottom → unlock with your key →
   **Send a test post to Discord** → then Generate and Save a PIN for each team and
   DM each manager their PIN.

## Things you can change

All in `lib/config.js`:

- `MANAGER_NAMES`: show real names instead of Sleeper usernames
- `ROOKIE_ROUNDS`: rounds in your rookie draft (default 4)
- `COOLDOWN_DAYS`: wait time between direction switches (default 21)

## How the numbers work

- **Win-now roster**: best possible starting lineup by redraft value.
- **Long-term value**: total dynasty value of the roster plus draft picks.
- **Core age**: average age of the team's 8 most valuable players.
- **Thin**: starters at that position rank in the bottom 3 of the league.
- **Deep bench**: bench value at that position ranks in the top 3.
- **Data's suggestion**: 75% win-now roster rank, 25% record once everyone has
  played 3 games. Top 3 = contender, bottom 3 = rebuilder, the rest = stuck in the middle.

Player values come from FantasyCalc (10-team, PPR, 1QB or Superflex, read from your
Sleeper settings), refreshed daily. If FantasyCalc is down, the last good copy is used.
