# My TV Shows

Personal ranked list of watched TV shows. Live at https://rishika1113.github.io/watched-shows/
(repo rishika1113/watched-shows; every push to `main` redeploys via `.github/workflows/deploy.yml`).

## Updating the list (the user asks in chat, e.g. "add X at rank 10")

- `src/data/shows.json` is the source of truth. Edit it directly.
  - `finished`: ranked list; `rank` must stay 1..N with no gaps, so renumber after inserting, moving or removing.
  - `wishlist` and `discontinued` ("Dropped" tab) are unranked.
  - Fields: `title`, `start`, `end` (null = still airing), `imdb` (IMDB rating; leave null if unknown, never use TMDB's rating).
- Do NOT re-run `scripts/convert.py` unless the user says the spreadsheet is up to date again; it overwrites shows.json.
- After editing, run `npm run posters` (needs `.env` with TMDB_API_KEY; only looks up new titles).
  Check any "(matched ...)" line; fix wrong matches in `scripts/tmdb-overrides.json` (title -> TMDB TV id).
- `npm run build` to verify, then commit and push to `main`. The site updates in about a minute.
