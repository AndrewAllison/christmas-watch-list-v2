import { isGuideMedia } from '#lib/server/catalogue.js';
import type { Db } from '#lib/server/db/index.js';
import { type NewWatchEvent, watchEvents } from '#lib/server/db/schema.js';
import type { TickInput } from '#lib/tick.js';

/** Insert a manual watch. Does not favourite the title or add it to a season. */
export async function recordTick(db: Db, userId: string, tick: TickInput) {
	if (!(await isGuideMedia(db, tick.mediaId))) return false;
	await db.insert(watchEvents).values(watchEventValues(userId, tick)).onConflictDoNothing();
	return true;
}

function watchEventValues(userId: string, tick: TickInput): NewWatchEvent {
	const base = {
		id: tick.id,
		userId,
		mediaId: tick.mediaId,
		source: 'manual' as const
	};
	switch (tick.datePrecision) {
		case 'exact':
			return { ...base, datePrecision: 'exact', watchedAt: tick.watchedAt, watchedYear: null };
		case 'year':
			return { ...base, datePrecision: 'year', watchedAt: null, watchedYear: tick.watchedYear };
		case 'unknown':
			return { ...base, datePrecision: 'unknown', watchedAt: null, watchedYear: null };
		default: {
			const unreachable: never = tick;
			return unreachable;
		}
	}
}
