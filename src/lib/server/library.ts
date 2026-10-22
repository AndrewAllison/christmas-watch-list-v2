import { eq, inArray, sql } from 'drizzle-orm';
import type { DiscoveryTitle } from '#lib/discovery.js';
import type { HistoryEvent } from '#lib/history-log.js';
import type { ListTitle, ListWatch } from '#lib/my-list.js';
import type { Db } from '#lib/server/db/index.js';
import { media, seasonEntries, watchEvents } from '#lib/server/db/schema.js';

export async function loadGuide(db: Db): Promise<DiscoveryTitle[]> {
	return db
		.select({
			id: media.id,
			title: media.title,
			year: media.year,
			posterUrl: media.posterUrl,
			type: media.type
		})
		.from(media)
		.where(inArray(media.holidayRelevance, ['christmas', 'adjacent']))
		.orderBy(sql`${media.year} desc nulls last`, media.title);
}

export async function loadSeasonYears(db: Db, userId: string) {
	const rows = await db
		.select({ seasonYear: seasonEntries.seasonYear, mediaId: seasonEntries.mediaId })
		.from(seasonEntries)
		.where(eq(seasonEntries.userId, userId));
	return rows;
}

export interface StoredWatch extends ListWatch {
	mediaId: string;
	title: string;
	year: number | null;
	posterUrl: string | null;
	type: 'movie' | 'tv';
	createdAt: Date;
}

export async function loadWatches(db: Db, userId: string): Promise<StoredWatch[]> {
	const rows = await db
		.select({
			mediaId: media.id,
			title: media.title,
			year: media.year,
			posterUrl: media.posterUrl,
			type: media.type,
			datePrecision: watchEvents.datePrecision,
			watchedAt: watchEvents.watchedAt,
			watchedYear: watchEvents.watchedYear,
			createdAt: watchEvents.createdAt
		})
		.from(watchEvents)
		.innerJoin(media, eq(media.id, watchEvents.mediaId))
		.where(eq(watchEvents.userId, userId));
	return rows;
}

export function historyEvents(watches: readonly StoredWatch[]): HistoryEvent[] {
	return watches.map((watch) => ({
		mediaId: watch.mediaId,
		title: watch.title,
		year: watch.year,
		posterUrl: watch.posterUrl,
		createdAt: watch.createdAt
	}));
}

export function titlesFromWatches(watches: readonly StoredWatch[]): Map<string, ListTitle> {
	const byId = new Map<string, ListTitle>();
	for (const watch of watches) {
		let title = byId.get(watch.mediaId);
		if (!title) {
			title = {
				id: watch.mediaId,
				title: watch.title,
				year: watch.year,
				posterUrl: watch.posterUrl,
				type: watch.type,
				watches: []
			};
			byId.set(watch.mediaId, title);
		}
		title.watches.push({
			datePrecision: watch.datePrecision,
			watchedAt: watch.watchedAt,
			watchedYear: watch.watchedYear
		});
	}
	return byId;
}
