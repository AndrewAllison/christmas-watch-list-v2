/**
 * Copy the public V1 catalogue into V2. Read-only on V1. Dry-run unless `--write`.
 *
 *   DATABASE_URL_V1=... DATABASE_URL=... node --experimental-strip-types scripts/migrate-from-v1.ts
 *   DATABASE_URL_V1=... DATABASE_URL=... node --experimental-strip-types scripts/migrate-from-v1.ts --write
 *
 * DATABASE_URL must be the V2 Neon database. DATABASE_URL_V1 is select-only.
 */
import { Client } from 'pg';
import { mapV1Media, summariseImports } from '../src/lib/catalogue-import.ts';

const write = process.argv.includes('--write');
const v1Url = process.env.DATABASE_URL_V1 ?? process.env.V1_DATABASE_URL;
const v2Url = process.env.DATABASE_URL;

if (!v1Url || !v2Url) {
	console.error('Need DATABASE_URL_V1 (read-only) and DATABASE_URL (V2).');
	process.exit(1);
}
if (v1Url === v2Url) {
	console.error('DATABASE_URL_V1 and DATABASE_URL are the same. Refusing to continue.');
	process.exit(1);
}

const selectSql = `
	SELECT id, title, year, description, poster_url, backdrop_url, source_ids, genres,
		runtime, imdb_id, type, holiday_relevance, visibility_status, hidden, approval_status
	FROM media
`;

const upsertSql = `
	INSERT INTO media (
		id, title, year, description, poster_url, backdrop_url, type, genres, runtime,
		source_ids, holiday_relevance
	) VALUES (
		$1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11
	)
	ON CONFLICT (id) DO UPDATE SET
		title = EXCLUDED.title,
		year = EXCLUDED.year,
		description = EXCLUDED.description,
		poster_url = EXCLUDED.poster_url,
		backdrop_url = EXCLUDED.backdrop_url,
		type = EXCLUDED.type,
		genres = EXCLUDED.genres,
		runtime = EXCLUDED.runtime,
		source_ids = EXCLUDED.source_ids,
		holiday_relevance = EXCLUDED.holiday_relevance,
		updated_at = now()
`;

const v1 = new Client({ connectionString: v1Url });
const v2 = new Client({ connectionString: v2Url });

await v1.connect();
await v1.query('SET default_transaction_read_only = on');
await v2.connect();

try {
	const { rows } = await v1.query(selectSql);
	const mapped = rows.map((row) => mapV1Media(row));
	const summary = summariseImports(mapped);
	const ready = mapped.flatMap((result) => (result.ok ? [result.row] : []));
	console.log(write ? 'write' : 'dry-run');
	console.log(`read ${rows.length}`);
	console.log(`ready ${summary.ready}`);
	console.log('skipped', summary.skipped);
	console.log(
		'sample',
		ready.slice(0, 5).map((row) => `${row.holidayRelevance} ${row.year ?? ''} ${row.title}`)
	);
	if (!write) {
		console.log('Dry run only. Pass --write to upsert into V2.');
	} else {
		await v2.query('BEGIN');
		for (const row of ready) {
			// One connection: pg will not run these queries in parallel.
			// oxlint-disable-next-line no-await-in-loop
			await v2.query(upsertSql, [
				row.id,
				row.title,
				row.year,
				row.description,
				row.posterUrl,
				row.backdropUrl,
				row.type,
				row.genres == null ? null : JSON.stringify(row.genres),
				row.runtime,
				JSON.stringify(row.sourceIds),
				row.holidayRelevance
			]);
		}
		await v2.query('COMMIT');
		console.log(`upserted ${ready.length}`);
	}
} catch (error) {
	if (write) await v2.query('ROLLBACK').catch(() => {});
	throw error;
} finally {
	await v1.end();
	await v2.end();
}
