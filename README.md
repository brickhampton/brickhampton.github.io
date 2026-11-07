# Brickhampton Stats

Basketball stats for Brickhampton: every game since W24, box scores, leaders, trends, player pages and records.
Live at **https://brickhampton.github.io**. Anyone with the link can view; editing happens in Admin mode behind a PIN.

## How it's built

- React + Vite single-page app, hosted free on GitHub Pages (`.github/workflows/deploy.yml` publishes every push to `main`).
- Pages have their own addresses (`#/game/S26-5`, `#/player/lim`, `#/stats`), so a game or player can be shared as a link.
- Data: Supabase (free tier). Setup is in `supabase/README.md`. Anyone can read; every change goes through database functions that need an Admin session opened with the PIN.
- `.github/workflows/keep-awake.yml` reads one row every three days so the free project never pauses.
- `.github/workflows/backup.yml` saves all team data every night to the `backups` branch (`scripts/backup.mjs`), keeping two weeks. Each dated folder has a `restore.sql` to paste into the Supabase SQL editor; the branch README has the steps.
- Each browser keeps a copy of the last data it loaded, so the site opens instantly and still shows the stats on a bad connection. When the database can't be reached it says so ("Offline, showing saved stats") and tries again once the connection is back.
- Only the database part of Supabase is loaded (`@supabase/postgrest-js`), and recording, Settings, the avatar builder, Edit game and Share load when first opened (`src/lazy.jsx`), so the first visit downloads less.
- Saving a recorded game twice can't make a duplicate: if the first save worked but its reply was lost, the second Save finds the identical game already saved and finishes (`savedCopy` in `src/lib/record.js`).
- If something in the site breaks, a "Something went wrong" page with Reload shows instead of a blank screen (`src/components/Crash.jsx`).
- It can be added to an iPhone or iPad Home Screen as an app (`public/manifest.webmanifest`, `public/apple-touch-icon.png`), and shared links show a preview card (`public/og.png`). A Home Screen app keeps its own copy of the data, Admin unlock and any game being recorded, separate from Safari.

## Stats

Recorded per player per game: 2PT, 3PT and FT made and missed, OREB, DREB, AST, STL, BLK, TO. Everything else is calculated:

- PTS = 2×2FGM + 3×3FGM + FTM; TSA = FGA + 0.44×FTA; TS% = PTS ÷ (2×TSA)
- PER = PTS + 0.75×REB + 1.5×AST + 1.5×STL + 1.5×BLK − missed 2s − missed 3s − missed FTs − TO.
  Games with OREB/DREB (S26 on) use 1.0×OREB + 0.5×DREB instead of 0.75×REB. Season and career PER add up each game's own PER.

## Working on it

```sh
npm install
npm run dev        # local site at http://localhost:5173
npm test           # checks PER, TS%, totals, Player of the game, badges and the double-save guard
npm run build      # production build in dist/
npm run check -- path/to/brickhampton-master-data.csv   # compare the import with the master sheet, row by row
node scripts/make-seed-sql.mjs   # rebuild supabase/02-history.sql from src/data/seed.js
```

## Phases

1. Read-only site from the imported history (done).
2. Supabase database, plus a scheduled ping so the free project never pauses (done).
3. Record a game behind the Admin PIN: Who played today, the tap entry screen, undo, end game (done).
4. Admin mode: seasons, results, roster, opponents, Edit game, Delete game, Change history with Undo, CSV backup (this).
