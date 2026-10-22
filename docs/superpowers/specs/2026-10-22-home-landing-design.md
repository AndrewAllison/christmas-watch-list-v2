# Home landing and Discovery — 2026-10-22

**Status:** agreed for a first build. The plan is `docs/superpowers/plans/2026-10-22-home-landing.md`. Browser review may revise the layout. The rules below are the slice to build.

This revises Home, the tab bar, and search from `docs/superpowers/specs/2026-10-22-home-season-history-design.md`. Season storage, watch precision, and History in that document still hold. Decision D26 records the change.

## Places

| Place | Route | Who sees it | Job |
| --- | --- | --- | --- |
| Home | `/` | Everyone | Three counts, Up next, and Latest releases |
| Discovery | `/discovery` | Everyone | The full guide: search, Show seen, add, mark watched |
| Season | `/season` | Signed in | This year's list, split into still to watch and watched |
| History | `/history` | Signed in | Lifetime watch log, with a count per title |

The path is `/discovery`, lowercase, in line with `/season` and `/history`. The tab label is Discovery. Its icon is a magnifying glass.

Signed out, the bar is Home and Discovery. Signed in, the bar is Home, Discovery, and Season, in that order. The existing pill grows to fit the tabs. History stays in the profile control. Sign in stays in the header when signed out.

A direct visit to `/discovery` works. Signed out, that page is look-only. A direct visit to `/season` or `/history` while signed out still redirects to `/sign-in?next=` that path.

`/my-list` still redirects to `/season`. `/watched` and `/tick` still redirect to `/history`.

Home does not read `q` or `seen`. Those parameters belong to Discovery.

## Home

The page has no "What to watch next" heading, no Open Season button in the top panel, no Show seen control, and no search field. The `homeListCopy` sentences leave this screen, and their tests leave with them.

**Signed out.** There is no count panel and no Up next shelf. Latest releases is the first 12 Christmas and adjacent titles, latest release year first, then title. A missing year sorts last. The row is look-only. An empty guide reads "The guide is empty."

**Signed in.** A panel of three links, then Up next, then Latest releases.

The visible labels are **To watch**, **This season**, and **All time**. Each link shows the number, including 0. The accessible name carries the fuller meaning:

- To watch: "To watch, 1 title still on this year's list" or "To watch, N titles still on this year's list"
- This season: "This season, 1 title watched" or "This season, N titles watched"
- All time: "All time, 1 title" or "All time, N titles"

To watch opens `/season#season-still`. This season opens `/season#season-watched`. All time opens `/history`. When Season is showing its empty card, those headings are absent and the link still opens `/season`.

**To watch** is the number of this year's seasonal-list titles that `watchedThisSeason` rejects.

**This season** is the number of distinct titles `watchedThisSeason` accepts, whether or not they are on this year's list. That is the same set as Season's Watched section. A repeat watch of the same title does not increase the number.

**All time** is the number of History rows: one per title with any watch event. A repeat watch does not increase the number. An unknown-date "I've seen it" counts here and does not count in This season.

**Up next** is the Still to watch set from Season, in that page's order: latest release year first, then title. The row scrolls sideways and shows every title. There is no cap. Each signed-in poster can remove the title from this season or mark it watched. Under the row, one text link reads "Open Season" and goes to `/season`. The section is always present for a signed-in person.

When this year's list has no rows, the row reads "Nothing chosen for this season yet." When the list has rows and none are still to watch, the row reads "Nothing left to watch this season." The Open Season link stays in both cases.

**Latest releases** is the first 12 Christmas and adjacent titles with no watch event, latest release year first, then title, after every Up next title has been removed. A title already in Up next does not appear again here. Each signed-in poster can add the title to this season or mark it watched. When none remain, the shelf reads "Nothing new in this view."

Mark watched on Home returns to `/`.

## Discovery

The page title is "Discovery · Christmas Watch List". The heading is Discovery. The search field is first. Its accessible name and placeholder are "Search titles". The form is GET, so `q` stays in the address.

The guide is every Christmas and adjacent title, latest release year first, then title. A missing year sorts last. `nonRelated` stays excluded. There is no length cap.

**Signed out.** The grid is that whole guide. Search narrows it by a case-insensitive title substring. `seen` is ignored. There is no Show seen, no add, and no mark watched.

**Signed in, Show seen off (the default).** The grid is titles with no watch event. A title on this year's list with no watch event stays in the grid.

**Signed in, Show seen on.** The grid is titles with at least one watch event that are not on this year's list. The control is the current "Show seen" / "Showing seen" button, with `aria-pressed`, and it submits GET with `seen=1`.

A non-empty query narrows whichever set is showing. The query is trimmed. Above the grid, the heading reads "1 title" or "N titles". No match reads "No titles match that." An empty query shows the set under the Discovery heading and does not add a count heading. An empty set with an empty query reads "No titles in this view." Signed out, an empty guide with an empty query reads "The guide is empty."

Each signed-in poster can add or remove the title from this season, or mark it watched. Add does not write a watch event and does not set `is_favourite`. Mark watched does not insert a seasonal row. After add, remove, or mark watched, the page returns to the same `/discovery` address, including `q` and `seen`. Adding a title while Show seen is on takes it off that filtered list, because it is now on this season.

The results use the existing poster grid: three columns, four from the small breakpoint, five from the medium breakpoint.

## Season empty state

When Season has no list rows and no title watched this season, the empty card keeps the title "Nothing chosen for this season yet". The description reads "Add titles from Discovery. A new season starts empty." The link reads "Browse Discovery" and goes to `/discovery`. The inner Still to watch and Watched empty lines on a non-empty Season page stay as they are.

## Data

No new table and no new dependency. Home and Discovery, when signed in, read the guide, this year's seasonal rows, and the user's watch events, then derive the counts and shelves in memory. Signed out, they read the guide only. The request stays on the queries these pages already use.

`watchedThisSeason` is unchanged. An exact date counts only inside 1 Nov–31 Dec of the season year. A year-only event counts only when its year is that season year. An unknown date counts for neither To watch's removal nor This season.

## Errors

A signed-out POST to add, remove, or record redirects to sign-in with `next` set to the page that sent it, including a Discovery query. A missing title, a non-guide title, or an invalid id fails with "Could not save that" or the existing "That title is not in the guide" failure, and writes nothing. A duplicate seasonal row is a success with no second row. Removing a seasonal row leaves watch events in place.

## Tests

Pure rules, next to the modules:

- To watch equals this year's list minus titles `watchedThisSeason` accepts.
- This season equals that accepted set, including titles that were never added to the list.
- All time equals the number of History rows. A second event for the same title leaves the number unchanged.
- An unknown-date event is in All time and out of This season.
- Up next is Still to watch, latest release year first, then title.
- Latest releases is the first 12 titles with no watch event, excluding Up next ids. Fewer than 12 shows however many remain.
- Discovery with an empty query is the seen or unseen set. A query narrows that set by title. Signed-out Discovery ignores `seen`.
- The return address after a tick on Discovery preserves `q` and `seen`. The return address on Home is `/`.
- Signed out, the tabs are Home and Discovery. Signed in, they are Home, Discovery, and Season. Discovery is active on `/discovery` and any path under it, and inactive on a path that only shares the prefix, such as `/discover`.
- Add does not write a watch. A watch does not insert a seasonal row.

## Out of scope

Time, audience, and mood filters. A richer search. Sort options beyond release year. Collections. Traditions. Schema changes. New dependencies. Changing Season's inner empty lines. A modal search on Home.
