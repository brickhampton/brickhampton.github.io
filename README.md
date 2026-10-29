# Brickhampton Stats

Basketball stats for Brickhampton: every game since W24, box scores, leaders, trends, player pages and records.
Live at **https://brickhampton.github.io**. Anyone with the link can view; editing happens in Admin mode behind a PIN.

## How it's built

- React + Vite single-page app, hosted free on GitHub Pages (`.github/workflows/deploy.yml` publishes every push to `main`).
- Pages have their own addresses (`#/game/S26-5`, `#/player/lim`, `#/stats`), so a game or player can be shared as a link.
- Data: the imported master sheet (`src/data/seed.js`) for now. The Supabase database arrives in Phase 2.

## Stats

Recorded per player per game: 2PT, 3PT and FT made and missed, OREB, DREB, AST, STL, BLK, TO. Everything else is calculated:

- PTS = 2×2FGM + 3×3FGM + FTM; TSA = FGA + 0.44×FTA; TS% = PTS ÷ (2×TSA)
- PER = PTS + 0.75×REB + 1.5×AST + 1.5×STL + 1.5×BLK − missed 2s − missed 3s − missed FTs − TO.
  Games with OREB/DREB (S26 on) use 1.0×OREB + 0.5×DREB instead of 0.75×REB. Season and career PER add up each game's own PER.

## Working on it

```sh
npm install
npm run dev        # local site at http://localhost:5173
npm run build      # production build in dist/
npm run check -- path/to/brickhampton-master-data.csv   # compare the import with the master sheet, row by row
```

## Phases

1. Read-only site from the imported history (this).
2. Supabase database, plus a scheduled ping so the free project never pauses.
3. Record a game: Who played today, the tap entry screen, undo, end game.
4. Admin mode: PIN checked on the server with lockout, auto-lock after 15 minutes, and every Admin edit.
