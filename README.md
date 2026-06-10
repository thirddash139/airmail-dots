# Airmail Dots ✈

Dots & boxes by post — a slow, friendly two-player game for people who aren't in
the same place. One link, play whenever. Each player taps a line on their own
time; the page syncs moves automatically. You can also slip a short note in
with the game, postcard-style.

No accounts, no sign-ups, no frameworks. A single static page plus one
serverless function.

## Deploy to Vercel (about 3 minutes)

1. **Put this folder on Vercel.** Easiest path: push it to a GitHub repo, then
   in Vercel click **Add New → Project** and import the repo. (Or, from inside
   this folder, run `npx vercel` and accept the defaults.) No build settings
   needed — it deploys as-is.
2. **Connect the free database.** In the Vercel dashboard, open the project →
   **Storage** tab → **Create Database** → choose **Upstash Redis** (free
   plan) → connect it to this project. Vercel injects the credentials
   automatically.
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the function picks up the
   new credentials.

That's it. Open your URL, start a game, and tap **Copy invite link** — the
link includes the game code, so your partner just opens it, types their name,
and plays.

If you skip step 2, the app shows a friendly "one step left" screen telling
you exactly what to connect.

## How play works

- 5×5 dots, 4×4 boxes. On your turn, tap a gap to draw a line.
- Close the fourth side of a box: it's stamped with your initial and you draw
  again.
- Most boxes when the board fills wins. Rematch alternates who starts.
- Notes can be posted any time and show up as postmarked postcards.
- The page checks for your partner's moves every few seconds while open, and
  again whenever you return to the tab. Games are kept for 90 days after the
  last move.

## Files

- `index.html` — the entire game (vanilla HTML/CSS/JS)
- `api/game.js` — reads/writes game state to Upstash Redis (zero dependencies)
