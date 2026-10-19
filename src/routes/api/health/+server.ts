import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const started = Date.now();
	try {
		const db = await locals.db();
		await db.execute(sql`select 1`);
		return json(
			{ ok: true, db: { ok: true, ms: Date.now() - started } },
			{ headers: { 'cache-control': 'no-store' } }
		);
	} catch (error) {
		console.error('health: db check failed', error);
		return json(
			{ ok: false, db: { ok: false, ms: Date.now() - started } },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
};
