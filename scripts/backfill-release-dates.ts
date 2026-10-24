/**
 * Fill media.release_date from TMDB. Dry-run unless `--write`. V2 only.
 *
 *   DATABASE_URL=... TMDB_API_KEY=... node --experimental-strip-types scripts/backfill-release-dates.ts
 *   DATABASE_URL=... TMDB_API_KEY=... node --experimental-strip-types scripts/backfill-release-dates.ts --write
 *
 * Movies use release_date. Series use first_air_date. A failed read leaves the stored day.
 */
import { Client } from 'pg';
import { releaseDayFromTmdb } from '../src/lib/release-date.ts';

const write = process.argv.includes('--write');
const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.TMDB_API_KEY;

if (!databaseUrl || !apiKey) {
	console.error('Need DATABASE_URL (V2) and TMDB_API_KEY.');
	process.exit(1);
}

const db = new Client({ connectionString: databaseUrl });
await db.connect();

const pause = () => new Promise((resolve) => setTimeout(resolve, 250));

function tmdbId(sourceIds: unknown): number | null {
	if (!sourceIds || typeof sourceIds !== 'object') return null;
	const tmdb = (sourceIds as { tmdb?: unknown }).tmdb;
	if (typeof tmdb === 'number' && Number.isInteger(tmdb) && tmdb > 0) return tmdb;
	if (typeof tmdb === 'string' && /^[1-9]\d*$/.test(tmdb)) return Number(tmdb);
	return null;
}

try {
	const { rows } = await db.query<{
		id: string;
		type: string;
		source_ids: unknown;
		release_date: string | null;
	}>(`SELECT id, type, source_ids, release_date::text AS release_date FROM media`);

	let matched = 0;
	let updates = 0;
	let skipped = 0;
	let requests = 0;

	for (const row of rows) {
		const tmdb = tmdbId(row.source_ids);
		if ((row.type !== 'movie' && row.type !== 'tv') || tmdb == null) {
			skipped += 1;
			continue;
		}
		// TMDB is paced at one request at a time.
		// oxlint-disable-next-line no-await-in-loop
		if (requests > 0) await pause();
		requests += 1;

		let day: string | null = null;
		try {
			// oxlint-disable-next-line no-await-in-loop
			const response = await fetch(
				`https://api.themoviedb.org/3/${row.type}/${tmdb}?api_key=${encodeURIComponent(apiKey)}`
			);
			if (!response.ok) {
				skipped += 1;
				continue;
			}
			// oxlint-disable-next-line no-await-in-loop
			const payload: unknown = await response.json();
			if (!payload || typeof payload !== 'object') {
				skipped += 1;
				continue;
			}
			day = releaseDayFromTmdb(row.type, payload);
		} catch {
			skipped += 1;
			continue;
		}

		if (!day) {
			skipped += 1;
			continue;
		}
		if (row.release_date === day) {
			matched += 1;
			continue;
		}
		updates += 1;
		if (write) {
			// One connection: pg will not run these queries in parallel.
			// oxlint-disable-next-line no-await-in-loop
			await db.query('UPDATE media SET release_date = $1, updated_at = now() WHERE id = $2', [
				day,
				row.id
			]);
		}
	}

	console.log(write ? 'write' : 'dry-run');
	console.log(`read ${rows.length}`);
	console.log(`matched ${matched}`);
	console.log(`write ${updates}`);
	console.log(`skipped ${skipped}`);
} finally {
	await db.end();
}
