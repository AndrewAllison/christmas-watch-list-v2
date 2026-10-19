import { env, waitUntil } from 'cloudflare:workers';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { getCookieCache, getSessionCookie } from 'better-auth/cookies';
import { isAuthPath } from 'better-auth/svelte-kit';
import { AUTH_BASE_PATH, type Auth, createAuth } from '#lib/server/auth.js';
import { connectDb, type Db, offlineDb } from '#lib/server/db/index.js';
import { building } from '$app/env';

/**
 * Runs once per isolate during Worker startup (1 s budget), not inside a request's
 * 10 ms Workers Free CPU budget. Better Auth's first use (lazy setup + JIT) costs
 * ~20-30 ms, so pay it here with a DB-less instance.
 */
export const init: ServerInit = async () => {
	if (building) return;
	try {
		const auth = createAuth(offlineDb(), env);
		await auth.handler(new Request(`${env.BETTER_AUTH_URL}${AUTH_BASE_PATH}/ok`));
		await auth.api.getSession({ headers: new Headers() });
	} catch (error) {
		console.warn('auth warm-up failed', error);
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	// Lazy so requests that never touch the DB (signed-out pages) don't open a connection.
	let dbPromise: Promise<Db> | undefined;
	let auth: Auth | undefined;
	event.locals.db = () => (dbPromise ??= connectDb(env.HYPERDRIVE.connectionString));
	event.locals.auth = async () => (auth ??= createAuth(await event.locals.db(), env));
	event.locals.user = null;
	event.locals.session = null;

	try {
		if (isAuthPath(event.url.href, { basePath: AUTH_BASE_PATH })) {
			return await (await event.locals.auth()).handler(event.request);
		}

		if (getSessionCookie(event.request)) {
			// The signed cookie cache (≤5 min old) answers most requests without building
			// Better Auth or touching the DB; on a miss, getSession re-reads and re-issues it.
			const cached = await getCookieCache(event.request, {
				secret: env.BETTER_AUTH_SECRET,
				isSecure: event.url.protocol === 'https:'
			});
			const result =
				cached ??
				(await (await event.locals.auth()).api.getSession({ headers: event.request.headers }));
			event.locals.user = result?.user ?? null;
			event.locals.session = result?.session ?? null;
		}

		return await resolve(event);
	} finally {
		if (dbPromise) {
			waitUntil(
				dbPromise.then(
					(db) => db.$client.end(),
					() => {}
				)
			);
		}
	}
};
