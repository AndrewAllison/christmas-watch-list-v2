# Decision log

Append new entries at the bottom. Don't rewrite history — supersede with a new entry.

## 2026-10-19 · Day 1 scaffold

### D1 — Hyperdrive is free on Workers Free → use it

**Checked:** Cloudflare docs on 2026-10-19 — [Hyperdrive pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/#hyperdrive), [Hyperdrive FAQ](https://developers.cloudflare.com/hyperdrive/reference/faq/), [Hyperdrive limits](https://developers.cloudflare.com/hyperdrive/platform/limits/).

- "Hyperdrive is included in both the Free and Paid Workers plans." FAQ: "Is Hyperdrive available on the Workers Free plan? Yes."
- Free plan: **100,000 database queries/day** (reset 00:00 UTC; over the limit, queries error), **~20 origin connections per config**, 60 s max query duration. No egress charges.
- Our usage (one household-scale PWA, a handful of queries per page) is far below this.

**Decision:** Neon via **Hyperdrive**. `@neondatabase/serverless` is not used. Revisit only if we approach 100k queries/day.

### D2 — Drizzle driver is node-postgres (`pg`), not Postgres.js

Cloudflare's [Drizzle + Hyperdrive guide](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/) states: "Pairing Drizzle ORM with the Postgres.js driver over Hyperdrive is not currently supported. Switch your driver to node-postgres." We use `drizzle-orm/node-postgres` with a `pg.Client` per request (`connectDb`). Verified locally in workerd (`wrangler dev`) through the Hyperdrive binding's `localConnectionString`.

### D3 — Hyperdrive caching disabled for MVP

Hyperdrive caches read queries by default (60 s) and never invalidates on write. Session lookups and "tick then see it on My List" need read-after-write consistency. Create the staging config with `--caching-disabled`. If the catalogue later needs caching, add a second cached binding for Browse only (watch the ~20 origin-connection budget across configs).

### D4 — Formatter: Biome (format-only). Linter: Oxlint

Roadmap said pick oxfmt **or** Biome. oxfmt 0.73 skipped `.svelte` files entirely when tested; Biome 2.5 formats Svelte (`html.experimentalFullSupportEnabled`) and organises imports. Biome's linter is disabled so Oxlint is the only linter.

### D5 — TypeScript 6, not 7

TypeScript 7.0 (native) is out, but SvelteKit 3.1 and svelte-check 4.7 declare `typescript@^5 || ^6` peers and `svelte-kit sync` crashes under 7. Pinned `^6.0.3`; revisit when Kit supports 7.

### D6 — pnpm 12 with default `minimumReleaseAge`

`packageManager: pnpm@12.14.0`. pnpm 12 refuses packages published < 24 h ago by default; we keep that supply-chain guard (so a few deps resolve one patch behind "latest"). Build scripts allowed only for `esbuild` and `workerd` (`allowBuilds` in `pnpm-workspace.yaml`).

### D7 — SvelteKit 3 specifics

- No `event.platform`: bindings via `import { env, waitUntil } from 'cloudflare:workers'` (adapter-cloudflare 8).
- `#lib/*` Node subpath imports replace `$lib`; paths need extensions.
- `tsconfig` sets `checkJs: false` because the generated `worker-configuration.d.ts` imports the built `_worker.js`.

### D8 — Four bottom tabs: Browse · My List · Tick · Season

Day-1 brief asks for bottom tabs for the four MVP screens. Roadmap §5 describes Tradition Tick as a Sheet/Drawer over Browse/My List. Both hold: the **Tick tab** is a quick "tick something off" entry point (search → panel), and the same panel opens from Browse/My List rows on Day 5.

### D9 — Schema

- Lean tables per roadmap §4: `media`, `watch_events`, `user_media_state` + Better Auth `user`/`session`/`account`/`verification` (field names verified against `getAuthTables()` in better-auth 1.7).
- `snake_case` columns via Drizzle `casing` (both runtime and drizzle-kit).
- Better Auth IDs are `text`; `media.id` / `watch_events.id` are `uuid` (V1 UUIDs preserved; clients can mint tick IDs offline).
- `watch_events_precision_check` enforces `exact ⇒ watched_at`, `year ⇒ watched_year`; mirrored by the Zod `tickInput` schema.
- **V1 repo was not readable** from this environment (404 — private). Schema is derived from the roadmap's V1 summary; re-check enum values (`holidayRelevance`, `datePrecision`, `source`) against V1 before the migration script (Day 3).

### D10 — Single festive theme

One "festive midnight" palette (`--midnight`, `--berry`, `--mint`, `--holly`, `--gold`, `--paper`) mapped onto shadcn semantic tokens. No light/dark toggle in MVP.

### D11 — Workers Free CPU budget (risk)

Workers Free allows 10 ms CPU per request. Google OAuth + Email OTP avoid password hashing, which is the usual Better Auth CPU hog. Watch CPU time in Workers Observability on staging (Day 2).
