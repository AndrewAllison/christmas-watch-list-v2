import { redirect } from '@sveltejs/kit';
import { activeSeasonYear, seasonCalendar, seasonPhaseLabel, seasonWindow } from '#lib/season.js';
import { partitionSeason } from '#lib/season-list.js';
import { loadGuide, loadSeasonYears, loadWatches, titlesFromWatches } from '#lib/server/library.js';
import { seasonListAction } from '#lib/server/season-entries.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/sign-in?next=${encodeURIComponent(url.pathname + url.search)}`);
	const db = await locals.db();
	const guide = await loadGuide(db);
	const entries = await loadSeasonYears(db, locals.user.id);
	const watches = titlesFromWatches(await loadWatches(db, locals.user.id));
	const active = activeSeasonYear();
	const years = [...new Set(entries.map((entry) => entry.seasonYear))].toSorted((a, b) => b - a);
	const requested = Number(url.searchParams.get('year'));
	const year = years.includes(requested) ? requested : active;
	const season = seasonWindow(year);
	const onList = new Set(
		entries.filter((entry) => entry.seasonYear === year).map((entry) => entry.mediaId)
	);
	const listed = guide
		.filter((title) => onList.has(title.id))
		.map((title) => {
			const found = watches.get(title.id);
			if (found) return found;
			return {
				id: title.id,
				title: title.title,
				year: title.year,
				posterUrl: title.posterUrl,
				type: title.type,
				watches: []
			};
		});
	const others = [...watches.values()].filter((title) => !onList.has(title.id));
	const split = partitionSeason(listed, others, season);
	const calendar = seasonCalendar(new Date(), season);
	const mark = (item: (typeof split.stillToWatch)[number]) => ({
		id: item.id,
		title: item.title,
		year: item.year,
		posterUrl: item.posterUrl,
		onSeason: onList.has(item.id)
	});
	return {
		year,
		active,
		years,
		phaseLabel: seasonPhaseLabel(calendar),
		calendar,
		stillToWatch: split.stillToWatch.map(mark),
		watched: split.watched.map(mark)
	};
};

export const actions = {
	add: (event) => seasonListAction(true, event),
	remove: (event) => seasonListAction(false, event)
} satisfies Actions;
