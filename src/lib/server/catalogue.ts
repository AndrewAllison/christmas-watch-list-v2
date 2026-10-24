import { eq } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.js';
import { media } from '#lib/server/db/schema.js';

/** Christmas and adjacent titles are the guide. Anything else is refused. */
export async function isGuideMedia(db: Db, mediaId: string) {
	const [row] = await db
		.select({ holidayRelevance: media.holidayRelevance })
		.from(media)
		.where(eq(media.id, mediaId))
		.limit(1);
	return row?.holidayRelevance === 'christmas' || row?.holidayRelevance === 'adjacent';
}

/** The stored TMDB day, or null when the title has none. */
export async function mediaReleaseDate(db: Db, mediaId: string) {
	const [row] = await db
		.select({ releaseDate: media.releaseDate })
		.from(media)
		.where(eq(media.id, mediaId))
		.limit(1);
	return row?.releaseDate ?? null;
}
