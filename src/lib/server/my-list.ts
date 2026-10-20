import { and, eq } from 'drizzle-orm';
import { groupListRows, type MyListView, splitMyList } from '#lib/my-list.js';
import type { Db } from '#lib/server/db/index.js';
import { media, userMediaState, watchEvents } from '#lib/server/db/schema.js';

export async function loadFavouriteIds(db: Db, userId: string) {
	const rows = await db
		.select({ mediaId: userMediaState.mediaId })
		.from(userMediaState)
		.where(and(eq(userMediaState.userId, userId), eq(userMediaState.isFavourite, true)));
	return new Set(rows.map((row) => row.mediaId));
}

export async function loadMyList(
	db: Db,
	userId: string,
	now: Date = new Date()
): Promise<MyListView> {
	const rows = await db
		.select({
			id: media.id,
			title: media.title,
			year: media.year,
			posterUrl: media.posterUrl,
			type: media.type,
			datePrecision: watchEvents.datePrecision,
			watchedAt: watchEvents.watchedAt,
			watchedYear: watchEvents.watchedYear
		})
		.from(userMediaState)
		.innerJoin(media, eq(media.id, userMediaState.mediaId))
		.leftJoin(
			watchEvents,
			and(eq(watchEvents.mediaId, media.id), eq(watchEvents.userId, userMediaState.userId))
		)
		.where(and(eq(userMediaState.userId, userId), eq(userMediaState.isFavourite, true)))
		.orderBy(media.title);

	return splitMyList(groupListRows(rows), now);
}

/** Returns false when the title is not in the catalogue. */
export async function setFavourite(db: Db, userId: string, mediaId: string, onList: boolean) {
	const [found] = await db
		.select({ id: media.id })
		.from(media)
		.where(eq(media.id, mediaId))
		.limit(1);
	if (!found) return false;

	await db
		.insert(userMediaState)
		.values({ userId, mediaId, isFavourite: onList })
		.onConflictDoUpdate({
			target: [userMediaState.userId, userMediaState.mediaId],
			set: { isFavourite: onList, updatedAt: new Date() }
		});
	return true;
}
