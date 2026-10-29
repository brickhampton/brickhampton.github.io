# Database setup (Supabase)

Run these once, in order, in the Supabase dashboard: **SQL Editor → New query**, paste the file, then **Run**.

1. `01-schema.sql`: the tables, read-only access for everyone, and the Admin PIN check.
2. `02-history.sql`: every game from the master sheet, W24 to S26.
3. `03-set-pin.sql`: put your four-digit PIN between the quotes first. This is the only place the PIN is typed outside the app.
4. `04-record.sql`: saving a recorded game, and editing a season's opponents.

How it's protected:

- The website uses the publishable key, which can only read the stats.
- Every change (recording a game, Admin edits) goes through database functions that need an Admin session. Only the PIN opens one.
- The PIN is stored as a bcrypt hash in a private schema the website can't read. Five wrong tries lock it for 15 minutes, and Admin locks itself after 15 minutes without a tap.
- `02-history.sql` is generated from `src/data/seed.js` by `node scripts/make-seed-sql.mjs`.
