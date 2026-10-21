# Product vision — Christmas Watch List

## Why this exists

Recreate the anticipation of the Christmas Radio Times double issue: looking through the guide, circling programmes to watch, rediscovering familiar favourites, and ticking them off throughout the season. The product is a mobile-first, fast, delightful Christmas viewing companion, not a general-purpose film tracker.

**Product promise:** discover something worth watching, plan this Christmas, and build a living record of Christmas viewing traditions.

## The three complementary jobs

1. **Discover.** Curated, useful pathways into Christmas films, specials and short-form programmes, including overlooked gems. Help a household answer “We have 20 minutes, the kids are here, what could we watch?”
2. **Collect.** Let completionists mark titles they have *ever* watched and see progress through meaningful curated collections, regardless of whether those titles appear on this year's list.
3. **Celebrate a season.** Let people circle this year's intentions, record this year's watches and revisit recurring traditions across years.

None of these jobs should require the others. A user may browse without an account, record historical watches without creating a seasonal list, or circle a few familiar traditions without chasing completion.

## Core mental model — do not conflate

- **Catalogue title:** canonical media and factual metadata.
- **Favourite:** enduring personal affection for a title.
- **Seasonal intention (“circled”):** a title the user wants to watch during a particular Christmas season. Not equivalent to favourite.
- **Watch event (“ticked”):** a record of having watched a title; repeated watches are legitimate. Preserve exact date, year-only and unknown-date precision without inventing dates.
- **Collection:** a curated, ordered or themed set of catalogue titles; it drives discovery and lifetime progress. Collection completion derives from historical watching, not from favourites or seasonal intentions.

The existing MVP currently uses favourites as “My List” and treats seasonal completion accordingly. **That is a current implementation, not the target domain model.** Any migration must preserve V1/V2 data and have an explicit, reviewed schema proposal.

## Signature experience

- Open the Christmas issue: see inviting editorial collections and a rapid “What shall we watch?” entry point, not an undifferentiated count of titles.
- Open a collection: understand its theme; see watched/unwatched progress; mark previously seen titles; circle an unwatched title for this season.
- Find something for tonight: filter by *actual* running time, audience suitability, mood and seen/unseen state; return useful matches quickly. Missing metadata must not silently satisfy strict constraints.
- Watch and tick: lightweight interaction wherever the title appears, with optional precision when adding historical watches.
- Return next season: previous years remain visible; recurring favourites and discoveries feel like traditions.

## Experience principles

- **Magical but practical:** festive editorial warmth with small, satisfying interactions; legibility and speed first.
- **Mobile-first PWA:** thumb-friendly controls, excellent loading states and accessible semantics.
- **Low-friction discovery:** short paths to answers, no lengthy questionnaires.
- **Progress without punishment:** celebrate collection progress and seasonal achievements; avoid guilt-inducing daily streaks or incentives to keep lists artificially small.
- **Intentional curation:** don't assume every item tagged Christmas belongs in the same shelf. “Adjacent” and alternative titles need clear framing.
- **Trustworthy metadata:** runtime, audience and viewing history accuracy beat speculative AI suggestions. Never fabricate availability, ratings, dates or watched status.
- **No compulsory AI:** deterministic, metadata-based retrieval first; AI-assisted enrichment or natural-language discovery is a possible later enhancement.
- **Scope discipline:** do not introduce TV broadcast schedules, streaming-provider integrations, social networks or expansive gamification while establishing the core loop.

## Success signals

Assess whether users can quickly find a suitable title, mark previously watched titles, discover new-to-them material, build a personal seasonal issue, and return to record a watch. Track distinct behaviours independently; don't equate favourite counts with watches or completion.

See [product-roadmap.md](./product-roadmap.md) for ordering and [product-domain.md](./product-domain.md) for semantics.
