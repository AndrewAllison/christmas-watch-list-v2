import { describe, expect, it } from 'vitest';
import { discoveryTab, homeTab, isTabActive, seasonTab, tabsFor } from './navigation';

describe('tabsFor', () => {
	it('shows Home and Discovery until the user is signed in', () => {
		expect(tabsFor(false).map((tab) => tab.label)).toEqual(['Home', 'Discovery']);
		expect(tabsFor(true).map((tab) => [tab.label, tab.href])).toEqual([
			['Home', '/'],
			['Discovery', '/discovery'],
			['Season', '/season']
		]);
	});
});

describe('isTabActive', () => {
	it('only matches Home on the root path', () => {
		expect(isTabActive(homeTab, '/')).toBe(true);
		expect(isTabActive(homeTab, '/season')).toBe(false);
		expect(isTabActive(homeTab, '/discovery')).toBe(false);
	});

	it('matches the season path', () => {
		expect(isTabActive(seasonTab, '/season')).toBe(true);
		expect(isTabActive(seasonTab, '/season/abc')).toBe(true);
		expect(isTabActive(seasonTab, '/seasonal')).toBe(false);
	});

	it('matches Discovery and not a path that only shares the prefix', () => {
		expect(isTabActive(discoveryTab, '/discovery')).toBe(true);
		expect(isTabActive(discoveryTab, '/discovery/abc')).toBe(true);
		expect(isTabActive(discoveryTab, '/discover')).toBe(false);
	});
});
