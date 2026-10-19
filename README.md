# Christmas Watch List V2

A Radio Times Christmas double-issue feel for your festive favourites: tick off the films and specials you watch every year, with the date you watched them. Installable PWA, rebuilt from scratch on Cloudflare Workers.

V1 stays live at [christmaswatchlist.co.uk](https://christmaswatchlist.co.uk) until V2 reaches parity.

**Stack:** SvelteKit 3 · Cloudflare Workers (Free) · Neon Postgres via Hyperdrive · Drizzle · Better Auth · shadcn-svelte + Tailwind v4 · Oxlint · Biome · Vitest · pnpm.

Agent/contributor conventions: [`AGENTS.md`](./AGENTS.md). Why things are the way they are: [`docs/decisions.md`](./docs/decisions.md).

## Getting started

Requires Node 24 (`.nvmrc`) and pnpm 12 (`corepack enable` picks it up from `packageManager`).

```sh
pnpm install
cp .env.example .env            # drizzle-kit / scripts
cp .dev.vars.example .dev.vars  # Worker runtime secrets (auth, Day 2)
pnpm dev
```

Local dev talks to Postgres at the `localConnectionString` in `wrangler.jsonc` (`postgres://postgres:postgres@localhost:5432/christmas_watch_list`). Override it with `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`, e.g. a Neon dev branch.

## Scripts

| Command               | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `pnpm check`          | format check + lint + typecheck + tests (same as CI)     |
| `pnpm format`         | Biome format + organise imports                          |
| `pnpm lint`           | Oxlint                                                   |
| `pnpm typecheck`      | Wrangler types check + svelte-check                      |
| `pnpm test`           | Vitest                                                   |
| `pnpm build`          | Production build for Workers                             |
| `pnpm db:generate`    | Generate a SQL migration from the Drizzle schema         |
| `pnpm db:migrate`     | Apply migrations to `DATABASE_URL` (V2 Neon only)        |
| `pnpm deploy:staging` | Build and deploy to the staging Worker on `workers.dev`  |

## Staging setup (one-off)

1. Create a **new** Neon project (or branch) for V2 — never reuse V1 production.
2. `DATABASE_URL=<direct url> pnpm db:migrate`
3. `pnpm wrangler hyperdrive create cwl-v2-staging --connection-string="<url>" --caching-disabled` and paste the id into `env.staging.hyperdrive` in `wrangler.jsonc`, then `pnpm cf:types` to refresh local types.
4. `pnpm wrangler secret put <NAME> --env staging` for each key in `.dev.vars.example`.
5. `pnpm deploy:staging`
