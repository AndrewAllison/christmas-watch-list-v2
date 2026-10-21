# Domain semantics for agents

This document states the *intended semantics*, not a claim that all concepts are already implemented.

## Definitions

| Concept | Question answered | Persistence |
| --- | --- | --- |
| Media | What title is this? | Canonical catalogue |
| Favourite | Do I love it? | Across years |
| Seasonal intention | Have I circled it for this Christmas? | Scoped to a season |
| Watch event | When, or approximately when, did I watch it? | Historical, repeatable |
| Collection | Which titles belong in this curated theme? | Editorial / catalogue |
| Collection progress | Which distinct members have I ever seen? | Derived |
| Season progress | Which titles planned for this season were watched in this season? | Derived |

Never use `is_favourite` as a permanent synonym for seasonal intention in new designs. Existing MVP queries currently do this; don't change their behaviour without a deliberate migration and compatibility plan.

## Date precision and seasons

- An exact dated event is assigned to a season only if it falls in that season's defined window.
- A year-only event can support a year-level history claim; define how it contributes to Nov–Dec season statistics before changing the existing rules.
- An unknown-date tick establishes “ever watched” but **does not** establish “watched in season X”.
- Repeat watch events are valid. Use distinct media IDs when computing collection completion.
- Christmas seasons span 1 November–31 December under the existing MVP rule; show the chosen season explicitly and preserve old seasons. Review the existing pre-November active-season rule separately rather than silently switching it.

## Derived examples

- Someone marks *Home Alone* “watched, don't remember when”: it counts toward lifetime completion of “Essential Classics”, not 2026 season completion.
- Someone watches *Home Alone* in 2025 and 2026: two watch events, one distinct watched title in a lifetime collection, and potentially a recurring tradition.
- Someone loves *Die Hard* but doesn't circle it this year: still a favourite, absent from this year's intentions.
- Someone circles a hidden gem and has never watched it: it appears in this season's plans but not lifetime completion.

## Data and recommendation integrity

- Existing catalogue rows and migrated V1 identifiers are durable; don't destroy or regenerate watch events.
- Collection membership and ordering need editorial provenance; no fake “official” canon.
- Runtime is a constraint, not a vibe. Handle incomplete data explicitly.
- Separate audience suitability from genre. Don't present age recommendations as verified unless sourced and reviewed.
- Preserve the distinction between user-supplied ratings, external ratings and editorial picks; none is required for the initial slice.
- Recommendation results should be explainable, lightweight and deterministic before adding AI.

## Implementation process

Inspect `src/lib/server/db/schema.ts`, existing queries, and `docs/decisions.md` before proposing new entities. Document proposed tables, keys, uniqueness constraints, derived queries, migrations, and how historical records retain meaning. Obtain approval before modifying the schema.
