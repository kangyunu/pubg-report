# PUBG Match Crawler

This project crawls PUBG match data from DAK.GG and saves the results to `public/matches`.

## Run

```bash
bun run start --season <season>
```

- `<season>` is optional.
- If no season is provided, the default is `pc-2018-40`.

## Output

When the command runs, match data is crawled and saved under `public/matches`.

- Daily match files are saved as `docs/matches/YYYY-MM-DD.json`.
- A date-based file index is saved as `docs/matches/files.json`.
- `files.json` contains the list of match-date files (for example, `matches/2026-03-06.json`).
