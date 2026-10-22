import { latestShelfCount } from './discovery.js';

export interface HomeCounts {
	toWatch: number;
	thisSeason: number;
	allTime: number;
}

/** Lengths only. Callers pass Still to watch, Season's Watched set, and the History row count. */
export function homeCounts(
	stillToWatch: readonly unknown[],
	watchedThisSeason: readonly unknown[],
	allTime: number
): HomeCounts {
	return {
		toWatch: stillToWatch.length,
		thisSeason: watchedThisSeason.length,
		allTime
	};
}

export type HomeStat = 'toWatch' | 'thisSeason' | 'allTime';

export function homeStatLabel(stat: HomeStat, count: number): string {
	const titles = count === 1 ? 'title' : 'titles';
	switch (stat) {
		case 'toWatch':
			return `To watch, ${count} ${titles} still on this year's list`;
		case 'thisSeason':
			return `This season, ${count} ${titles} watched`;
		case 'allTime':
			return `All time, ${count} ${titles}`;
		default: {
			const never: never = stat;
			return never;
		}
	}
}

/** `listCount` is this year's seasonal rows only. Null when the shelf has cards. */
export function upNextCopy(listCount: number, stillCount: number): string | null {
	if (listCount === 0) return 'Nothing chosen for this season yet.';
	if (stillCount === 0) return 'Nothing left to watch this season.';
	return null;
}

/** Preserves the order it is given. Defaults to the latest-shelf cap. */
export function latestReleases<T extends { id: string }>(
	unwatched: readonly T[],
	upNextIds: ReadonlySet<string>,
	count = latestShelfCount
): T[] {
	const picked: T[] = [];
	for (const title of unwatched) {
		if (upNextIds.has(title.id)) continue;
		picked.push(title);
		if (picked.length === count) break;
	}
	return picked;
}
