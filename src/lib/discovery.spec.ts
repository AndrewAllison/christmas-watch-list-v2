import { describe, expect, it } from 'vitest';
import {
	type DiscoveryTitle,
	discoveryGuide,
	discoveryNext,
	discoveryResults,
	discoverySeen,
	discoveryStatus,
	filterDiscovery,
	matchTitles,
	orderByRelease,
	posterAction,
	takeLatest
} from './discovery';

const title = (over: Partial<DiscoveryTitle> & Pick<DiscoveryTitle, 'id'>): DiscoveryTitle => ({
	title: over.id,
	year: 2000,
	posterUrl: null,
	releaseDate: null,
	type: 'movie',
	...over
});

describe('orderByRelease', () => {
	it('sorts the latest release year first and missing years last', () => {
		const ordered = orderByRelease([
			title({ id: 'old', year: 1994, title: 'The Santa Clause' }),
			title({ id: 'none', year: null, title: 'Undated' }),
			title({ id: 'new-b', year: 2025, title: 'Snowball' }),
			title({ id: 'new-a', year: 2025, title: 'Arthur' })
		]);
		expect(ordered.map((item) => item.id)).toEqual(['new-a', 'new-b', 'old', 'none']);
	});
});

describe('filterDiscovery', () => {
	const titles = [title({ id: 'new' }), title({ id: 'seen' }), title({ id: 'listed' })];
	const watched = new Set(['seen', 'listed']);
	const season = new Set(['listed']);

	it('hides anything with a watch event by default', () => {
		expect(filterDiscovery(titles, false, watched, season).map((item) => item.id)).toEqual(['new']);
	});

	it('shows seen titles that are not on this season when the filter is on', () => {
		expect(filterDiscovery(titles, true, watched, season).map((item) => item.id)).toEqual(['seen']);
	});
});

describe('takeLatest', () => {
	it('keeps the first dozen', () => {
		const titles = Array.from({ length: 14 }, (_, index) => title({ id: String(index) }));
		expect(takeLatest(titles)).toHaveLength(12);
		expect(takeLatest(titles)[0]?.id).toBe('0');
	});
});

describe('matchTitles', () => {
	it('matches a title and ignores a blank query', () => {
		const titles = [
			title({ id: 'love', title: 'Love Actually' }),
			title({ id: 'elf', title: 'Elf' })
		];
		expect(matchTitles(titles, ' love ').map((item) => item.id)).toEqual(['love']);
		expect(matchTitles(titles, '   ')).toEqual([]);
	});
});

describe('discoverySeen', () => {
	it('is on only for a signed-in seen=1 request', () => {
		expect(discoverySeen(true, '1')).toBe(true);
		expect(discoverySeen(true, null)).toBe(false);
		expect(discoverySeen(false, '1')).toBe(false);
	});
});

describe('discoveryGuide', () => {
	const titles = [title({ id: 'new' }), title({ id: 'seen' }), title({ id: 'listed' })];
	const watched = new Set(['seen']);
	const season = new Set(['listed']);

	it('returns the whole guide when signed out, even with seen=1', () => {
		expect(discoveryGuide(titles, false, true, watched, season).map((item) => item.id)).toEqual([
			'new',
			'seen',
			'listed'
		]);
	});

	it('keeps an unwatched list title in the default guide', () => {
		expect(discoveryGuide(titles, true, false, watched, season).map((item) => item.id)).toEqual([
			'new',
			'listed'
		]);
	});

	it('uses the seen filter when signed in', () => {
		expect(discoveryGuide(titles, true, true, watched, season).map((item) => item.id)).toEqual([
			'seen'
		]);
	});
});

describe('discoveryResults', () => {
	const titles = [
		title({ id: 'love', title: 'Love Actually' }),
		title({ id: 'elf', title: 'Elf' })
	];

	it('returns the set for an empty query and narrows a typed one', () => {
		expect(discoveryResults(titles, '   ').map((item) => item.id)).toEqual(['love', 'elf']);
		expect(discoveryResults(titles, ' love ').map((item) => item.id)).toEqual(['love']);
	});
});

describe('discoveryNext', () => {
	it('keeps seen and the query on the discovery path', () => {
		expect(discoveryNext('', false)).toBe('/discovery');
		expect(discoveryNext(' Elf ', true)).toBe('/discovery?seen=1&q=Elf');
	});
});

describe('posterAction', () => {
	it('keeps the page query and names add or remove', () => {
		expect(posterAction('', false)).toBe('?/add');
		expect(posterAction('?q=Elf&seen=1', false)).toBe('?q=Elf&seen=1&/add');
		expect(posterAction('q=Elf', true)).toBe('?q=Elf&/remove');
		expect(posterAction('?/add', false)).toBe('?/add');
	});
});

describe('discoveryStatus', () => {
	it('names a non-empty search and an empty search', () => {
		expect(discoveryStatus(1, 'elf', true)).toEqual({ kind: 'results', label: '1 title' });
		expect(discoveryStatus(2, 'elf', true)).toEqual({ kind: 'results', label: '2 titles' });
		expect(discoveryStatus(0, 'elf', true)).toEqual({
			kind: 'empty',
			label: 'No titles match that.'
		});
	});

	it('uses the empty-guide lines only when the query is blank', () => {
		expect(discoveryStatus(4, '  ', true)).toEqual({ kind: 'guide' });
		expect(discoveryStatus(0, '', true)).toEqual({
			kind: 'empty',
			label: 'No titles in this view.'
		});
		expect(discoveryStatus(0, '', false)).toEqual({ kind: 'empty', label: 'The guide is empty.' });
	});
});
