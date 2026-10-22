import { describe, expect, it } from 'vitest';
import { groupHistory } from './history-log';
import { homeCounts, homeStatLabel, latestReleases, upNextCopy } from './home-landing';
import type { ListTitle } from './my-list';
import { seasonWindow } from './season';
import { partitionSeason } from './season-list';

const season = seasonWindow(2026);

const title = (id: string, watches: ListTitle['watches']): ListTitle => ({
	id,
	title: id,
	year: 2000,
	posterUrl: null,
	type: 'movie',
	watches
});

const unknown = [{ datePrecision: 'unknown' as const, watchedAt: null, watchedYear: null }];
const december = [
	{
		datePrecision: 'exact' as const,
		watchedAt: new Date('2026-12-01T12:00:00Z'),
		watchedYear: null
	}
];

describe('homeCounts', () => {
	it('counts list waiting, every this-season watch, and one history row per title', () => {
		const split = partitionSeason(
			[title('waiting', []), title('seen-on-list', unknown), title('done', december)],
			[title('extra', december)],
			season
		);
		const history = groupHistory([
			{
				mediaId: 'seen-on-list',
				title: 'seen-on-list',
				year: 2000,
				posterUrl: null,
				createdAt: new Date('2020-01-01T00:00:00Z')
			},
			{
				mediaId: 'done',
				title: 'done',
				year: 2000,
				posterUrl: null,
				createdAt: new Date('2026-12-01T00:00:00Z')
			},
			{
				mediaId: 'done',
				title: 'done',
				year: 2000,
				posterUrl: null,
				createdAt: new Date('2026-12-02T00:00:00Z')
			},
			{
				mediaId: 'extra',
				title: 'extra',
				year: 2000,
				posterUrl: null,
				createdAt: new Date('2026-12-03T00:00:00Z')
			}
		]);
		expect(split.stillToWatch.map((item) => item.id)).toEqual(['waiting', 'seen-on-list']);
		expect(split.watched.map((item) => item.id)).toEqual(['done', 'extra']);
		expect(homeCounts(split.stillToWatch, split.watched, history.length)).toEqual({
			toWatch: 2,
			thisSeason: 2,
			allTime: 3
		});
	});
});

describe('homeStatLabel', () => {
	it('uses the singular and the plural', () => {
		expect(homeStatLabel('toWatch', 1)).toBe("To watch, 1 title still on this year's list");
		expect(homeStatLabel('toWatch', 2)).toBe("To watch, 2 titles still on this year's list");
		expect(homeStatLabel('thisSeason', 1)).toBe('This season, 1 title watched');
		expect(homeStatLabel('thisSeason', 0)).toBe('This season, 0 titles watched');
		expect(homeStatLabel('allTime', 1)).toBe('All time, 1 title');
		expect(homeStatLabel('allTime', 4)).toBe('All time, 4 titles');
	});
});

describe('upNextCopy', () => {
	it('distinguishes an empty list from a finished list', () => {
		expect(upNextCopy(0, 0)).toBe('Nothing chosen for this season yet.');
		expect(upNextCopy(3, 0)).toBe('Nothing left to watch this season.');
		expect(upNextCopy(3, 2)).toBeNull();
	});
});

describe('latestReleases', () => {
	it('skips Up next ids and keeps the first dozen of what remains', () => {
		const unwatched = Array.from({ length: 14 }, (_, index) => ({ id: String(index) }));
		const picked = latestReleases(unwatched, new Set(['0', '1']));
		expect(picked).toHaveLength(12);
		expect(picked[0]?.id).toBe('2');
		expect(latestReleases(unwatched.slice(0, 3), new Set(['0']))).toEqual([
			{ id: '1' },
			{ id: '2' }
		]);
	});
});
