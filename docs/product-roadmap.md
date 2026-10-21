# Product direction and sequencing

This is a **prioritised product direction, not blanket authorisation to implement every feature**. Agree on the next vertical slice, review migrations or dependencies before implementation, and keep the existing four-screen MVP usable throughout.

## Current baseline (October 2026)

SvelteKit on Cloudflare Workers, sign-in, migrated Christmas catalogue, Browse / My List / Tick / Season surfaces, watch events and favourites. Technical and cost constraints remain in AGENTS.md and docs/decisions.md.

## Next: one coherent collection experience

Start with **a single high-quality curated collection detail view**, not a broad redesign.

Acceptance criteria:
- A collection has a clear title, reason to exist, trustworthy membership and an intentional order.
- Posters and titles are browsable on a narrow mobile screen.
- Signed-in users can see whether each title was ever watched, even if it was not watched this season.
- Progress is the number of distinct watched titles in the collection divided by its total eligible titles; repeat watch events do not inflate progress.
- An unwatched title can be opened and then saved for the current season; existing favourites stay intact.
- A historical watch can be recorded without claiming it happened in the current season.
- Signed-out users can explore; the UI explains what sign-in unlocks.
- Empty, loading and missing-artwork cases are handled, along with accessible labels and reduced motion.
- Pure progress/domain calculations have tests.

**Before coding:** inspect the actual schema and migrated media quality; propose the smallest data model/API adjustment that supports collections and seasonal intention separately. Do not assume new tables are already authorised.

## Then: discover something tonight

Introduce a lightweight “What shall we watch?” flow.
- Quick constraints: available minutes, family/audience, mood, seen/unseen and optionally my list.
- Deterministic filtering, then a simple explainable ranking; do not require a model call.
- A strict 20-minute request must not show a 65-minute programme as a match.
- Unknown runtimes or suitability should be excluded from strict matches or explicitly labelled, never guessed.
- Show why an item matches; support rerolling without losing filters.
- Curate missing tags carefully; don't silently infer suitability from genre or artwork.

## Then: make viewing feel rewarding

Unify the tick interaction across discovery, title detail, collections and the season. Keep exact / year / unknown history precision; make repeats and historical backfill easy. Add restrained celebration and distinguish first-time discovery, repeat tradition and collection milestone.

## Then: enrich the Christmas issue

Make current-season intentions distinct from enduring favourites. Offer historical season views, smart editorial shelves and meaningful stats, with season rollover that preserves prior years.

## Later, explicitly out of scope for now

Broadcast schedules / EPG, streaming availability, social sharing or feeds, user-generated collections, complex achievements, AI chat, personalised LLM recommendations, push notifications and paid infrastructure.

## Review checklist for every agent task

1. Which core job improves: Discover, Collect, or Celebrate a Season?
2. Does this move a user through discover → circle → watch → tick → discover?
3. Is the distinction between historical watched, this-season watched, favourite and seasonal intention preserved?
4. Is the smallest possible change compatible with the existing Cloudflare / Neon free-tier architecture?
5. Does the work meet mobile, keyboard, reduced-motion, loading, accessibility and accuracy needs?
6. Are domain rules and migrations tested? Run `pnpm check` before proposing completion.
7. If the feature needs schema changes or new dependencies, stop and request a decision rather than improvising.
