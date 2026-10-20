import { describe, expect, it } from 'vitest';
import {
	groupListRows,
	type ListRow,
	type ListTitle,
	splitMyList,
	watchedThisSeason
} from './my-list';
import { seasonWindow } from './season';

const season = seasonWindow(2026);

const title = (over: Partial<ListTitle> & Pick<ListTitle, 'id'>): ListTitle => ({
	title: over.id,
	year: 1992,
	posterUrl: null,
	type: 'movie',
	watches: [],
	...over
});

describe('watchedThisSeason', () => {
	it('counts an exact date inside Nov–Dec', () => {
		expect(
			watchedThisSeason(
				[
					{ datePrecision: 'exact', watchedAt: new Date('2026-12-25T18:00:00Z'), watchedYear: null }
				],
				season
			)
		).toBe(true);
	});

	it('ignores an exact date from another season', () => {
		expect(
			watchedThisSeason(
				[
					{ datePrecision: 'exact', watchedAt: new Date('2025-12-25T18:00:00Z'), watchedYear: null }
				],
				season
			)
		).toBe(false);
	});

	it('counts a year-only tick for this season', () => {
		expect(
			watchedThisSeason([{ datePrecision: 'year', watchedAt: null, watchedYear: 2026 }], season)
		).toBe(true);
	});

	it('does not treat "don\'t remember" as watched this season', () => {
		expect(
			watchedThisSeason([{ datePrecision: 'unknown', watchedAt: null, watchedYear: null }], season)
		).toBe(false);
	});
});

describe('groupListRows', () => {
	it('keeps one title when several watches join', () => {
		const rows: ListRow[] = [
			{
				id: 'a',
				title: 'Elf',
				year: 2003,
				posterUrl: null,
				type: 'movie',
				datePrecision: 'exact',
				watchedAt: new Date('2024-12-24T00:00:00Z'),
				watchedYear: null
			},
			{
				id: 'a',
				title: 'Elf',
				year: 2003,
				posterUrl: null,
				type: 'movie',
				datePrecision: 'year',
				watchedAt: null,
				watchedYear: 2026
			}
		];
		const [elf] = groupListRows(rows);
		expect(elf?.watches).toHaveLength(2);
	});

	it('leaves watches empty when the join finds none', () => {
		const [carol] = groupListRows([
			{
				id: 'b',
				title: 'Carol',
				year: 1992,
				posterUrl: null,
				type: 'movie',
				datePrecision: null,
				watchedAt: null,
				watchedYear: null
			}
		]);
		expect(carol?.watches).toEqual([]);
	});
});

describe('splitMyList', () => {
	const now = new Date('2026-12-01T00:00:00Z');

	it('puts an unticked favourite in still-to-watch and a ticked one in watched', () => {
		const list = splitMyList(
			[
				title({ id: 'carol', title: 'Carol' }),
				title({
					id: 'elf',
					title: 'Elf',
					watches: [
						{
							datePrecision: 'exact',
							watchedAt: new Date('2026-12-24T00:00:00Z'),
							watchedYear: null
						}
					]
				})
			],
			now
		);
		expect(list.seasonYear).toBe(2026);
		expect(list.stillToWatch.map((item) => item.id)).toEqual(['carol']);
		expect(list.watched.map((item) => item.id)).toEqual(['elf']);
	});

	it('uses last season before November', () => {
		const list = splitMyList(
			[
				title({
					id: 'elf',
					watches: [{ datePrecision: 'year', watchedAt: null, watchedYear: 2025 }]
				})
			],
			new Date('2026-10-20T12:00:00Z')
		);
		expect(list.seasonYear).toBe(2025);
		expect(list.watched.map((item) => item.id)).toEqual(['elf']);
	});
});
