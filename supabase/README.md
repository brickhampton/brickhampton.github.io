# Database setup (Supabase)

Run these once, in order, in the Supabase dashboard: **SQL Editor → New query**, paste the file, then **Run**.

1. `01-schema.sql`: the tables, read-only access for everyone, and the Admin PIN check.
2. `02-history.sql`: every game from the master sheet, W24 to S26.
3. `03-set-pin.sql`: put your four-digit PIN between the quotes first. This is the only place the PIN is typed outside the app.
4. `04-record.sql`: saving a recorded game, and editing a season's opponents.
5. `05-admin.sql`: every Admin mode edit, plus Change history with Undo. Safe to run again.
6. `06-avatars.sql`: saving avatars from the avatar builder, and the starters' first looks. Safe to run again.
7. `07-pixel-avatars.sql`: the starters' pixel avatars (leaves any avatar already changed in the builder alone). Safe to run again.

How it's protected:

- The website uses the publishable key, which can only read the stats.
- Every change (recording a game, Admin edits) goes through database functions that need an Admin session. Only the PIN opens one.
- Each change also saves a copy of the stats from just before it, so Undo in Change history can put them back (the last 40 are kept).
- The PIN is stored as a bcrypt hash in a private schema the website can't read. Five wrong tries lock it for 15 minutes, and Admin locks itself after 15 minutes without a tap.
- `02-history.sql` is generated from `src/data/seed.js` by `node scripts/make-seed-sql.mjs`.
