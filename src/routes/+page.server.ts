import {
	type DiscoveryTitle,
	filterDiscovery,
	orderByRelease,
	takeLatest
} from '#lib/discovery.js';
import { groupHistory } from '#lib/history-log.js';
import { homeCounts, latestReleases, upNextCopy } from '#lib/home-landing.js';
import type { ListTitle } from '#lib/my-list.js';
import { activeSeasonYear, seasonWindow } from '#lib/season.js';
import { partitionSeason } from '#lib/season-list.js';
import {
	historyEvents,
	loadGuide,
	loadSeasonYears,
	loadWatches,
	titlesFromWatches
} from '#lib/server/library.js';
import { seasonListAction } from '#lib/server/season-entries.js';
import type { Actions, PageServerLoad } from './$types';

function poster(
	title: {
		id: string;
		title: string;
		year: number | null;
		posterUrl: string | null;
		type: DiscoveryTitle['type'];
	},
	onSeason: boolean
) {
	return {
		id: title.id,
		title: title.title,
		year: title.year,
		posterUrl: title.posterUrl,
		type: title.type,
		onSeason
	};
}

function asList(title: DiscoveryTitle): ListTitle {
	return {
		id: title.id,
		title: title.title,
		year: title.year,
		posterUrl: title.posterUrl,
		type: title.type,
		watches: []
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const db = await locals.db();
	const guide = orderByRelease(await loadGuide(db));
	if (!locals.user) {
		return {
			signedIn: false as const,
			latest: takeLatest(guide).map((title) => poster(title, false))
		};
	}

	const entries = await loadSeasonYears(db, locals.user.id);
	const stored = await loadWatches(db, locals.user.id);
	const watches = titlesFromWatches(stored);
	const year = activeSeasonYear();
	const seasonIds = new Set(
		entries.filter((entry) => entry.seasonYear === year).map((entry) => entry.mediaId)
	);
	const watchedIds = new Set(watches.keys());
	const listed = guide
		.filter((title) => seasonIds.has(title.id))
		.map((title) => watches.get(title.id) ?? asList(title));
	const others = [...watches.values()].filter((title) => !seasonIds.has(title.id));
	const split = partitionSeason(listed, others, seasonWindow(year));
	const upNextIds = new Set(split.stillToWatch.map((title) => title.id));
	const unwatched = filterDiscovery(guide, false, watchedIds, seasonIds);
	return {
		signedIn: true as const,
		counts: homeCounts(
			split.stillToWatch,
			split.watched,
			groupHistory(historyEvents(stored)).length
		),
		upNext: split.stillToWatch.map((title) => poster(title, true)),
		upNextMessage: upNextCopy(listed.length, split.stillToWatch.length),
		latest: latestReleases(unwatched, upNextIds).map((title) => poster(title, false))
	};
};

export const actions = {
	add: (event) => seasonListAction(true, event),
	remove: (event) => seasonListAction(false, event)
} satisfies Actions;
