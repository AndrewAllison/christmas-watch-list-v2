import {
	type DiscoveryTitle,
	discoveryGuide,
	discoveryResults,
	discoverySeen,
	orderByRelease
} from '#lib/discovery.js';
import { activeSeasonYear } from '#lib/season.js';
import { loadGuide, loadSeasonYears, loadWatches, titlesFromWatches } from '#lib/server/library.js';
import { seasonListAction } from '#lib/server/season-entries.js';
import type { Actions, PageServerLoad } from './$types';

function poster(title: DiscoveryTitle, onSeason: boolean) {
	return {
		id: title.id,
		title: title.title,
		year: title.year,
		posterUrl: title.posterUrl,
		type: title.type,
		onSeason
	};
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const db = await locals.db();
	const guide = orderByRelease(await loadGuide(db));
	const query = url.searchParams.get('q') ?? '';
	if (!locals.user) {
		const titles = discoveryGuide(guide, false, false, new Set(), new Set());
		return {
			signedIn: false as const,
			seen: false,
			query,
			titles: discoveryResults(titles, query).map((title) => poster(title, false))
		};
	}

	const entries = await loadSeasonYears(db, locals.user.id);
	const watches = titlesFromWatches(await loadWatches(db, locals.user.id));
	const year = activeSeasonYear();
	const seasonIds = new Set(
		entries.filter((entry) => entry.seasonYear === year).map((entry) => entry.mediaId)
	);
	const watchedIds = new Set(watches.keys());
	const seen = discoverySeen(true, url.searchParams.get('seen'));
	const titles = discoveryGuide(guide, true, seen, watchedIds, seasonIds);
	return {
		signedIn: true as const,
		seen,
		query,
		titles: discoveryResults(titles, query).map((title) => poster(title, seasonIds.has(title.id)))
	};
};

export const actions = {
	add: (event) => seasonListAction(true, event),
	remove: (event) => seasonListAction(false, event)
} satisfies Actions;
