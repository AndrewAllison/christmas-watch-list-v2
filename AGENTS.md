# AGENTS.md

## Product

Radio Times–style **Christmas tradition tick-list PWA** — favourites you rewatch, ticked off with a date each season. **Not Trakt**: no universal history, no social graph, ratings are not core.

## Stack (locked)

SvelteKit 3 + `@sveltejs/adapter-cloudflare` (Workers) · shadcn-svelte (bits-ui) + Tailwind v4 · Neon Postgres via Hyperdrive · Drizzle (node-postgres driver) · Better Auth (Google + Email OTP via Resend) · Zod · `@vite-pwa/sveltekit` (Day 7) · pnpm.

**Cost is a hard constraint: free tiers only** (Workers Free, Hyperdrive Free, Neon Free, Resend Free). Anything that needs a paid plan must be raised first. See `docs/decisions.md`.

## MVP scope — only these

1. **Browse** guide (curated Christmas shelves)
2. **My List** (favourites + still-to-watch)
3. **Tradition Tick** (Just watched · Christmas Day · Boxing Day · Pick a date · Year only · Don't remember)
4. **Season progress** (1 Nov → 31 Dec)
5. PWA with optimistic offline ticks
6. Lean festive effects (lazy, `prefers-reduced-motion` respected)

**Do NOT add:** admin UI, Mastra/MCP, share, recommendations, goals, mood, advanced search, uploads, EPG/broadcast schedules, web push, three.js/Threlte, feature flags. Delete code instead of hiding it.

**Ask before** expanding the schema beyond `media` / `watch_events` / `user_media_state` / Better Auth tables, or adding any dependency.

## Commands

```sh
pnpm dev            # vite dev (Cloudflare bindings proxied via wrangler)
pnpm check          # format:check + lint + typecheck + test (run before every commit)
pnpm format         # Biome: format + organise imports
pnpm lint           # Oxlint (warnings fail)
pnpm typecheck      # wrangler types --check + svelte-check
pnpm test           # Vitest
pnpm build          # production build → .svelte-kit/cloudflare
pnpm cf:types       # regenerate worker-configuration.d.ts after editing wrangler.jsonc
pnpm db:generate    # new migration from src/lib/server/db/schema.ts
pnpm db:migrate     # apply migrations (DATABASE_URL = V2 Neon, never V1)
pnpm deploy:staging # build + wrangler deploy --env staging
```

## Conventions

- **pnpm only** (v12, `packageManager` pinned). Lockfile committed. pnpm's 1-day `minimumReleaseAge` stays on.
- Imports use `#lib/...` (Node subpath imports) **with file extensions**: `#lib/utils.js`, `#lib/components/ui/card/index.js`.
- Cloudflare bindings: `import { env, waitUntil } from 'cloudflare:workers'`. There is no `event.platform` in Kit 3.
- DB: `connectDb(env.HYPERDRIVE.connectionString)` **per request**; `waitUntil(db.$client.end())`. Never hold a client at module scope.
- Better Auth: `locals.auth()` (built per request by `createAuth` from `env`, shares `locals.db()`). Read the user from `locals.user` / `locals.session` (set in `hooks.server.ts` from the signed cookie cache). Auth reads must not go through a caching Hyperdrive config.
- SvelteKit 3: hook types from `@sveltejs/kit/hooks`; `building` from `$app/env`; external redirects need `redirect(303, url, { external: [...] })`.
- Workers Free = 10 ms CPU/request. Keep request-path work tiny; one-off warm-up belongs in the `init` hook (runs at isolate startup). See `docs/decisions.md` D13.
- Prefer `load` functions + form actions; minimal client state (`$state`), no stores libraries.
- Validate all external input with Zod (`src/lib/tick.ts` is the pattern).
- Colours come from theme tokens in `src/routes/layout.css` (`--midnight`, `--berry`, `--mint`, `--holly`, `--gold`, `--paper`). No hard-coded hex in components.
- `src/lib/components/ui/` = shadcn-svelte owned copies (add via `pnpm dlx shadcn-svelte@latest add <name>`); app components live in `src/lib/components/`.
- `src/lib/effects/` = lazy-loaded festive modules only (Day 8). Never on the auth/data critical path.
- `scripts/` = offline Node scripts (TMDB ingest, V1 migration). Never in the request path.
- Tests sit next to code as `*.spec.ts`. Pure domain logic gets unit tests.
- Salvage V1 **data and patterns**, never Next.js/React components.

## Layout

```text
src/
  routes/            # one folder per MVP surface; +layout.svelte = shell + tab bar
  lib/
    components/      # app components (tab-bar, …) + ui/ (shadcn-svelte)
    server/db/       # Drizzle schema + connectDb
    navigation.ts    # tab definitions
    season.ts        # season window helpers
    tick.ts          # Tradition Tick Zod schema
drizzle/             # generated SQL migrations (commit them)
docs/decisions.md    # decision log — append, don't rewrite
```
