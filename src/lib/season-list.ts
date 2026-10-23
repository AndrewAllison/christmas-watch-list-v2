import type { ListTitle } from '#lib/my-list.js';
import { watchedThisSeason } from '#lib/my-list.js';
import type { SeasonWindow } from '#lib/season.js';

export interface SeasonSplit {
	stillToWatch: ListTitle[];
	watched: ListTitle[];
}

/**
 * Still to watch is the seasonal list minus titles watched this season.
 * Watched merges those list titles with any other title watched this season.
 * Home's This season count uses the full watched set, including off-list titles.
 */
export function partitionSeason(
	entries: readonly ListTitle[],
	others: readonly ListTitle[],
	season: SeasonWindow
): SeasonSplit {
	const stillToWatch: ListTitle[] = [];
	const watched: ListTitle[] = [];
	for (const item of entries) {
		if (watchedThisSeason(item.watches, season)) watched.push(item);
		else stillToWatch.push(item);
	}
	for (const item of others) {
		if (watchedThisSeason(item.watches, season)) watched.push(item);
	}
	return { stillToWatch, watched };
}

export function seasonListCounts(entries: readonly ListTitle[], season: SeasonWindow) {
	let managed = 0;
	for (const item of entries) {
		if (watchedThisSeason(item.watches, season)) managed += 1;
	}
	return { still: entries.length - managed, managed };
}

export function emptySeasonPrompt() {
	return {
		description: 'Add titles from Discovery. A new season starts empty.',
		link: 'Browse Discovery',
		href: '/discovery' as const
	};
}
