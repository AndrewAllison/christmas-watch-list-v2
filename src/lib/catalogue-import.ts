/** V1 public catalogue rows that belong on the Browse shelves. */

export interface V1MediaRow {
	id: string;
	title: string;
	year: number | null;
	description: string | null;
	poster_url: string | null;
	backdrop_url: string | null;
	source_ids: unknown;
	genres: unknown;
	runtime: number | null;
	imdb_id: string | null;
	type: string;
	holiday_relevance: string | null;
	visibility_status: string;
	hidden: boolean | null;
	approval_status: string | null;
}

export interface CatalogueInsert {
	id: string;
	title: string;
	year: number | null;
	description: string | null;
	posterUrl: string | null;
	backdropUrl: string | null;
	type: 'movie' | 'tv';
	genres: string[] | null;
	runtime: number | null;
	sourceIds: { tmdb: number; imdb?: string };
	holidayRelevance: 'christmas' | 'adjacent';
}

export type SkipReason =
	| 'hidden'
	| 'not-approved'
	| 'not-visible'
	| 'relevance'
	| 'type'
	| 'missing-tmdb'
	| 'bad-genres';

export type MapResult =
	| { ok: true; row: CatalogueInsert }
	| { ok: false; reason: SkipReason; detail?: string };

function tmdbId(sourceIds: unknown): number | null {
	if (!sourceIds || typeof sourceIds !== 'object') return null;
	const tmdb = (sourceIds as { tmdb?: unknown }).tmdb;
	if (typeof tmdb === 'number' && Number.isInteger(tmdb) && tmdb > 0) return tmdb;
	if (typeof tmdb === 'string' && /^[1-9]\d*$/.test(tmdb)) return Number(tmdb);
	return null;
}

function imdbId(row: V1MediaRow): string | undefined {
	if (typeof row.imdb_id === 'string' && row.imdb_id.length > 0) return row.imdb_id;
	if (!row.source_ids || typeof row.source_ids !== 'object') return undefined;
	const imdb = (row.source_ids as { imdb?: unknown }).imdb;
	return typeof imdb === 'string' && imdb.length > 0 ? imdb : undefined;
}

function genresOf(value: unknown): string[] | null | undefined {
	if (value == null) return null;
	if (!Array.isArray(value) || value.some((genre) => typeof genre !== 'string')) return undefined;
	return value;
}

/**
 * Keep the row V1 would show to a signed-out visitor, and only the two Browse shelves.
 * Legacy relevance strings (`tradition`, `setting`, …) are skipped, not rewritten.
 */
export function mapV1Media(row: V1MediaRow): MapResult {
	if (row.hidden) return { ok: false, reason: 'hidden' };
	if (row.approval_status !== 'approved') return { ok: false, reason: 'not-approved' };
	if (row.visibility_status === 'hidden' || row.visibility_status === 'deleted') {
		return { ok: false, reason: 'not-visible' };
	}
	if (row.holiday_relevance !== 'christmas' && row.holiday_relevance !== 'adjacent') {
		return { ok: false, reason: 'relevance', detail: row.holiday_relevance ?? 'null' };
	}
	if (row.type !== 'movie' && row.type !== 'tv') {
		return { ok: false, reason: 'type', detail: row.type };
	}
	const tmdb = tmdbId(row.source_ids);
	if (tmdb == null) return { ok: false, reason: 'missing-tmdb' };
	const genres = genresOf(row.genres);
	if (genres === undefined) return { ok: false, reason: 'bad-genres' };
	const imdb = imdbId(row);
	return {
		ok: true,
		row: {
			id: row.id,
			title: row.title,
			year: row.year,
			description: row.description,
			posterUrl: row.poster_url,
			backdropUrl: row.backdrop_url,
			type: row.type,
			genres,
			runtime: row.runtime,
			sourceIds: imdb ? { tmdb, imdb } : { tmdb },
			holidayRelevance: row.holiday_relevance
		}
	};
}

export function summariseImports(results: MapResult[]) {
	const skipped: Record<string, number> = {};
	let ready = 0;
	for (const result of results) {
		if (result.ok) {
			ready += 1;
			continue;
		}
		const key = result.detail ? `${result.reason}:${result.detail}` : result.reason;
		skipped[key] = (skipped[key] ?? 0) + 1;
	}
	return { ready, skipped };
}
