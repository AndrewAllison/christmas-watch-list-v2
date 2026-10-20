import { describe, expect, it } from 'vitest';
import type { ListTitle } from './my-list';
import { splitMyList } from './my-list';
import { seasonCalendar, seasonWindow } from './season';
import { describeSeason, listProgressLabel } from './season-progress';

function title(id: string, name: string, watches: ListTitle['watches']): ListTitle {
	return { id, title: name, year: 1992, posterUrl: null, type: 'movie', watches };
}

describe('listProgressLabel', () => {
	it('counts watched favourites', () => {
		expect(listProgressLabel(0, 0)).toBe('Nothing on your list yet.');
		expect(listProgressLabel(1, 3)).toBe('1 of 3 watched.');
		expect(listProgressLabel(2, 2)).toBe('2 of 2 watched.');
	});
});

describe('describeSeason', () => {
	const now = new Date('2026-10-20T15:00:00Z');

	it('uses the same watched rule as My List', () => {
		const items = [
			title('elf', 'Elf', [{ datePrecision: 'year', watchedAt: null, watchedYear: 2025 }]),
			title('carol', 'Carol', [
				{ datePrecision: 'exact', watchedAt: new Date('2026-10-20T15:00:00Z'), watchedYear: null }
			]),
			title('forgotten', 'Forgotten', [
				{ datePrecision: 'unknown', watchedAt: null, watchedYear: null }
			])
		];
		const list = splitMyList(items, now);
		const view = describeSeason(list, seasonCalendar(now, seasonWindow(list.seasonYear)));
		expect(view.calendar).toMatchObject({ year: 2025, phase: 'after', day: 61 });
		expect(view.phaseLabel).toBe('That season has finished.');
		expect(view.list?.label).toBe('1 of 3 watched.');
		expect(view.list?.watchedTitles.map((item) => item.title)).toEqual(['Elf']);
		expect(view.list?.stillToWatch.map((item) => item.title)).toEqual(['Carol', 'Forgotten']);
	});
});
