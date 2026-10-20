import type { Db } from '#lib/server/db/index.js';
import { type NewWatchEvent, watchEvents } from '#lib/server/db/schema.js';
import { setFavourite } from '#lib/server/my-list.js';
import type { TickInput } from '#lib/tick.js';

/** Insert a manual tick and keep the title on My List. False when it is not in the guide. */
export async function recordTick(db: Db, userId: string, tick: TickInput) {
	const listed = await setFavourite(db, userId, tick.mediaId, true);
	if (!listed) return false;
	await db.insert(watchEvents).values(watchEventValues(userId, tick));
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
