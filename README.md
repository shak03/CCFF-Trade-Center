# CCFF Trade Center

- **Trade block** (home page, no login): every player and pick on the block, who listed
  it, their direction, what they want, and who's interested. Hitting "I'm interested"
  posts to Discord.
- **Teams**: every roster sized up (win-now, long-term, core age, thin spots, picks).
- **My team** (log in with your PIN): your roster and picks, add or remove things from
  the block, declare your direction, trade ideas, and a trade calculator that grades
  a deal for both sides before you send it in Sleeper.

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

Grade weights and cutoffs live in `lib/grade.js`.

## How the numbers work

- **Win-now roster**: best possible starting lineup by redraft value.
- **Long-term value**: total dynasty value of the roster plus draft picks.
- **Core age**: average age of the team's 8 most valuable players.
- **Thin**: starters at that position rank in the bottom 3 of the league.
- **Deep bench**: bench value at that position ranks in the top 3.
- **Data's suggestion**: 75% win-now roster rank, 25% record once everyone has
  played 3 games. Top 3 = contender, bottom 3 = rebuilder, the rest = stuck in the middle.

## How trade grades work

For each side, compare the team before and after the trade:

- **Win-now lineup**: redraft value of the best starting lineup (bench adds nothing).
- **Long-term core**: dynasty value of the top 14 players (1.75x starting slots) plus
  all picks. Depth past that adds nothing, so 3-for-1 packages don't win by quantity.
  From a rebuilder's side, players over 25 lose 7% of value per year (down to half).
- **Weighted score** by direction: contending 70% win-now / 30% long-term,
  retooling 50/50, rebuilding 30/70. Undeclared teams use the data's suggestion.
- **Letter grade** from the weighted % change: A+ ≥ 5, A ≥ 3, A- ≥ 2, B+ ≥ 1,
  B ≥ -1, B- ≥ -2, C+ ≥ -3, C ≥ -4.5, D ≥ -6.5, F below.

Trade ideas only show deals that help you (+0.5 or better) and grade B- or better
for the other team. Unpriced picks are estimated from where picks usually trade
relative to players.

Player values come from FantasyCalc (10-team, PPR, 1QB or Superflex, read from your
Sleeper settings), refreshed daily. If FantasyCalc is down, the last good copy is used.
