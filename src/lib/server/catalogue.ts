import { inArray } from 'drizzle-orm';
import { groupBrowseShelves } from '#lib/browse.js';
import type { Db } from '#lib/server/db/index.js';
import { media } from '#lib/server/db/schema.js';

export async function loadBrowseShelves(db: Db) {
	const rows = await db
		.select({
			id: media.id,
			title: media.title,
			year: media.year,
			posterUrl: media.posterUrl,
			type: media.type,
			genres: media.genres,
			holidayRelevance: media.holidayRelevance
		})
		.from(media)
		.where(inArray(media.holidayRelevance, ['christmas', 'adjacent']))
		.orderBy(media.title);

	return groupBrowseShelves(rows);
}
