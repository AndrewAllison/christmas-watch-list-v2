import { activeSeasonYear, seasonCalendar, seasonWindow } from '#lib/season.js';
import { describeSeason, describeSeasonClock } from '#lib/season-progress.js';
import { loadMyList } from '#lib/server/my-list.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const now = new Date();
	if (!locals.user) {
		const calendar = seasonCalendar(now, seasonWindow(activeSeasonYear(now)));
		return { signedIn: false as const, season: describeSeasonClock(calendar) };
	}
	const db = await locals.db();
	const list = await loadMyList(db, locals.user.id, now);
	const calendar = seasonCalendar(now, seasonWindow(list.seasonYear));
	return { signedIn: true as const, season: describeSeason(list, calendar) };
};
