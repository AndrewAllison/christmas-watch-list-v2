import { describe, expect, it } from 'vitest';
import { type BrowseItem, groupBrowseShelves } from './browse';

const item = (
	over: Partial<BrowseItem> & Pick<BrowseItem, 'id' | 'holidayRelevance'>
): BrowseItem => ({
	title: over.id,
	year: 1990,
	posterUrl: null,
	type: 'movie',
	...over
});

describe('groupBrowseShelves', () => {
	it('puts Christmas before adjacent and drops empty shelves', () => {
		const shelves = groupBrowseShelves([
			item({ id: 'a', holidayRelevance: 'adjacent', title: 'Die Hard' }),
			item({ id: 'c', holidayRelevance: 'christmas', title: 'Elf' }),
			item({ id: 'n', holidayRelevance: 'nonRelated', title: 'Heat' })
		]);

		expect(shelves.map((shelf) => shelf.relevance)).toEqual(['christmas', 'adjacent']);
		expect(shelves[0]?.items.map((row) => row.title)).toEqual(['Elf']);
		expect(shelves[1]?.items.map((row) => row.title)).toEqual(['Die Hard']);
	});

	it('returns no shelves when the catalogue has nothing festive', () => {
		expect(groupBrowseShelves([])).toEqual([]);
	});
});
