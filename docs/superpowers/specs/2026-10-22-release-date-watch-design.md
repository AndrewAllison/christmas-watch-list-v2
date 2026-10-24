# Release date on the Watched panel — 2026-10-22

**Status:** approved and implemented. Home still sorts by `media.year`.

A signed-in person can record a watch on the title's TMDB release day from the Watched panel. The day is stored on the catalogue and read back when they choose it. TMDB is called from an offline script, never from a page request.

## Date on the catalogue

Add nullable `release_date` to `media` through a committed Drizzle migration (`pnpm db:generate`). The column is a Postgres `date`. Drizzle reads and writes it as a `YYYY-MM-DD` string so the calendar day does not shift across time zones.

`media.year` stays the release year already imported from V1. Home still sorts by that year. This slice does not copy the new day back into `year`.

V1 never stored a calendar day. Its ingest kept only the year from TMDB `release_date` (movies) or `first_air_date` (series). Filling `release_date` needs a fresh TMDB read.

Until a real day is written, `release_date` stays `null`. The app does not invent a day from `year`. A later backfill that cannot read a day leaves a stored day in place.

## Backfill

`scripts/backfill-release-dates.ts` is an offline Node script, same posture as `scripts/migrate-from-v1.ts`. It connects only to `DATABASE_URL` (the V2 database). It has no V1 connection.

It exits before any request when `DATABASE_URL` or `TMDB_API_KEY` is missing. A row whose `sourceIds.tmdb` is not a positive integer is skipped. It calls TMDB v3:

| `media.type` | Request | Field |
| --- | --- | --- |
| `movie` | `GET /3/movie/{sourceIds.tmdb}` | `release_date` |
| `tv` | `GET /3/tv/{sourceIds.tmdb}` | `first_air_date` |

The catalogue is show-level, so a series uses the show's first air day.

Dry-run is the default. `--write` updates V2. The script waits 250ms between TMDB requests. A non-200 response, a network failure, an empty body, or a day that is not a real `YYYY-MM-DD` leaves the stored value unchanged. A new valid day replaces the stored day when the two strings differ. Re-running is safe.

The script prints how many rows it read, how many already matched, how many it would write, and how many it skipped. It does not print the API key.

Day extraction lives in `src/lib/release-date.ts` so tests can cover it without HTTP or SQL. The script owns the TMDB fetch and the update.

## Watched panel

Home (signed in), Discovery (signed in), Season, and History open the Watched panel. Each of those loads includes `releaseDate: string | null` on the row passed to the panel. Signed-out Home and Discovery stay look-only for the watch action.

When `releaseDate` is a real calendar day, the panel shows a button between the date form and the year form:

- Label: **Release date**
- Secondary text: the day, formatted from the ISO parts as `22 Nov 2025` (day with no leading zero, short English month, four-digit year). `2025-11-01` displays as `1 Nov 2025`. Formatting uses the `YYYY-MM-DD` parts, not the browser's local timezone.
- Submit: `POST /history?/record` with `choice=release-date` and `mediaId` only.

When the date is null or not a real calendar day, the button is absent.

The other four choices stay as they are: Just watched, a picked date, a year, and I've seen it.

## Saving

`parseTickForm` accepts `release-date` with a media id. A stray `watchedOn` or `watchedYear` on that choice is ignored.

The action loads `release_date` for that id from `media`. It does not trust a date posted by the browser.

- The title is not Christmas or adjacent: the existing 404, "That title is not in the guide".
- The title is in the guide and the stored day is missing or not a real calendar day: 400, "This title has no release date".
- The stored day is real: `exactWatchOnReleaseDay(id, mediaId, isoDate)` returns an exact watch at noon UTC on that day. The action saves it through the existing `recordTick` path. `date_precision` stays `exact`. `watched_at` is that noon. `watched_year` is null. The same function returns `null` for a null or invalid day, and the action then uses the 400 above.

`watchedThisSeason` is unchanged. The new event counts for this season only when that noon falls inside 1 Nov–31 Dec of the active season year. A June release day stays in History and does not count as watched this season.

Repeat watches stay valid. Choosing Release date adds another event. It does not add a seasonal row and it does not set a favourite.

## Tests

`src/lib/release-date.ts`:

- A movie payload yields `release_date` when that string is a real calendar day.
- A series payload yields `first_air_date` on the same rule.
- A movie payload ignores `first_air_date`. A series payload ignores `release_date`.
- Empty, missing, year-only, and impossible days (`2025-02-29`, `2025-11-31`) yield `null`. `2024-02-29` is kept.
- `22 Nov 2025` is the display string for `2025-11-22`. `1 Nov 2025` is the display string for `2025-11-01`.

`src/lib/tick.ts`:

- `release-date` parses with a media id alone.
- `exactWatchOnReleaseDay` for a stored `2025-11-22` produces `datePrecision: 'exact'` and noon UTC on that day.
- `exactWatchOnReleaseDay` returns `null` for a null or invalid stored day.

## Out of scope

- TMDB calls from the worker or from the panel.
- Episode or season premiere days.
- Showing the release day on catalogue cards.
- Changing Home sort, season windows, or date precision.
- Writing to the V1 database.
