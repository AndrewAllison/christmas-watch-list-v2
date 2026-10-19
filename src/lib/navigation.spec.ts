import { describe, expect, it } from 'vitest';
import { isTabActive, tabs } from './navigation';

const [browse, myList] = tabs;

describe('tabs', () => {
	it('exposes exactly the four MVP surfaces', () => {
		expect(tabs.map((t) => t.id)).toEqual(['browse', 'my-list', 'tick', 'season']);
	});
});

describe('isTabActive', () => {
	it('only matches Browse on the root path', () => {
		expect(isTabActive(browse, '/')).toBe(true);
		expect(isTabActive(browse, '/my-list')).toBe(false);
	});

	it('matches nested paths for non-root tabs', () => {
		expect(isTabActive(myList, '/my-list')).toBe(true);
		expect(isTabActive(myList, '/my-list/abc')).toBe(true);
		expect(isTabActive(myList, '/my-listing')).toBe(false);
	});
});
