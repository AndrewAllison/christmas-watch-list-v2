import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

export const casing = 'snake_case';

/**
 * Connect a Drizzle client for one request. Workers can't share TCP
 * connections across requests, so never hoist this to module scope.
 * Pass `env.HYPERDRIVE.connectionString` (from `cloudflare:workers`); Hyperdrive
 * pools upstream. Close with `waitUntil(db.$client.end())`.
 *
 * Uses node-postgres: Cloudflare documents Drizzle + Postgres.js over
 * Hyperdrive as unsupported.
 */
export async function connectDb(connectionString: string) {
	const client = new Client({ connectionString });
	await client.connect();
	return drizzle({ client, schema, casing });
}

export type Db = Awaited<ReturnType<typeof connectDb>>;

/** Connection-less Drizzle instance for exercising code paths that must not hit the DB. */
export function offlineDb() {
	return drizzle.mock({ schema, casing }) as unknown as Db;
}
