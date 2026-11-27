# Brickhampton Stats backups

Every night a GitHub job reads all the team data from the database and saves a copy here.
A new folder only appears on days when something changed, named by the date of the copy (UTC).
Folders older than two weeks are removed, apart from the newest one before then, so any day in the
last two weeks can be restored.
Each folder has:

- `restore.sql`: puts the database back exactly as it was in that copy.
- `data.json`: the same data, readable.

## Restore to a day

1. Open the folder for the day you want, or the latest one before it.
2. Open `restore.sql` and press **Copy raw file** (the copy icon at the top right of the file).
3. In the Supabase dashboard, go to **SQL Editor**, then **New query**. Paste, then press **Run**.
4. Reload the website.

The restore saves the current data to Change history first, so if it was the wrong day,
Admin > Change history > **Undo** puts things back. The Admin PIN isn't changed.

The website never reads this branch. It's made by `.github/workflows/backup.yml` on `main`.
