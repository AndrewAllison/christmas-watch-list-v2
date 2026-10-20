import { z } from 'zod';
import { activeSeasonYear, isInSeason, type SeasonWindow, seasonWindow } from '#lib/season.js';

/** Matches `date_precision` on watch_events. */
export type DatePrecision = 'exact' | 'year' | 'unknown';

export interface ListWatch {
	datePrecision: DatePrecision;
	watchedAt: Date | null;
	watchedYear: number | null;
}

export interface ListTitle {
	id: string;
	title: string;
	year: number | null;
	posterUrl: string | null;
	type: 'movie' | 'tv';
	watches: ListWatch[];
}

export interface MyListView {
	seasonYear: number;
	stillToWatch: ListTitle[];
	watched: ListTitle[];
}

/** One joined favourite + optional watch row, before watches are grouped. */
export interface ListRow {
	id: string;
	title: string;
	year: number | null;
	posterUrl: string | null;
	type: 'movie' | 'tv';
	datePrecision: DatePrecision | null;
	watchedAt: Date | null;
	watchedYear: number | null;
}

export const favouriteToggleInput = z.object({
	mediaId: z.uuid(),
	onList: z.enum(['true', 'false']).transform((value) => value === 'true')
});

/**
 * A title is watched this season when some tick is an exact date inside
 * 1 Nov–31 Dec, or a year-only tick for that season's year.
 * "Don't remember" does not clear it.
 */
export function watchedThisSeason(watches: ListWatch[], season: SeasonWindow): boolean {
	for (const watch of watches) {
		switch (watch.datePrecision) {
			case 'exact':
				if (watch.watchedAt && isInSeason(watch.watchedAt, season)) return true;
				break;
			case 'year':
				if (watch.watchedYear === season.year) return true;
				break;
			case 'unknown':
				break;
			default: {
				const never: never = watch.datePrecision;
				return never;
			}
		}
	}
	return false;
}

/** Collapse a left join (one row per watch) into one title with its watches. */
export function groupListRows(rows: ListRow[]): ListTitle[] {
	const byId = new Map<string, ListTitle>();
	for (const row of rows) {
		let title = byId.get(row.id);
		if (!title) {
			title = {
				id: row.id,
				title: row.title,
				year: row.year,
				posterUrl: row.posterUrl,
				type: row.type,
				watches: []
			};
			byId.set(row.id, title);
		}
		if (row.datePrecision) {
			title.watches.push({
				datePrecision: row.datePrecision,
				watchedAt: row.watchedAt,
				watchedYear: row.watchedYear
			});
		}
	}
	return [...byId.values()];
}

/** Favourites, split into still-to-watch and watched for the active season. */
export function splitMyList(items: ListTitle[], now: Date = new Date()): MyListView {
	const season = seasonWindow(activeSeasonYear(now));
	const stillToWatch: ListTitle[] = [];
	const watched: ListTitle[] = [];
	for (const item of items) {
		if (watchedThisSeason(item.watches, season)) watched.push(item);
		else stillToWatch.push(item);
	}
	return { seasonYear: season.year, stillToWatch, watched };
}
