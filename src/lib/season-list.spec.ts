import { describe, expect, it } from 'vitest';
import type { ListTitle } from './my-list';
import { seasonWindow } from './season';
import { emptySeasonPrompt, partitionSeason, seasonListCounts } from './season-list';

const season = seasonWindow(2026);

const title = (id: string, watches: ListTitle['watches']): ListTitle => ({
	id,
	title: id,
	year: 2000,
	posterUrl: null,
	type: 'movie',
	watches
});

const seen = [{ datePrecision: 'unknown' as const, watchedAt: null, watchedYear: null }];
const thisDecember = [
	{
		datePrecision: 'exact' as const,
		watchedAt: new Date('2026-12-01T12:00:00Z'),
		watchedYear: null
	}
];

describe('partitionSeason', () => {
	it('keeps an unseen list title in still-to-watch and merges an off-list December watch', () => {
		const split = partitionSeason(
			[title('listed', seen), title('done', thisDecember)],
			[title('extra', thisDecember), title('old', seen)],
			season
		);
		expect(split.stillToWatch.map((item) => item.id)).toEqual(['listed']);
		expect(split.watched.map((item) => item.id)).toEqual(['done', 'extra']);
	});
});

describe('seasonListCounts', () => {
	it('ignores watches that are not on the list', () => {
		expect(seasonListCounts([title('listed', seen), title('done', thisDecember)], season)).toEqual({
			still: 1,
			managed: 1
		});
	});
});

describe('emptySeasonPrompt', () => {
	it('sends an empty season to Discovery', () => {
		expect(emptySeasonPrompt()).toEqual({
			description: 'Add titles from Discovery. A new season starts empty.',
			link: 'Browse Discovery',
			href: '/discovery'
		});
	});
});
