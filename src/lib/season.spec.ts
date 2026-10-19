import { describe, expect, it } from 'vitest';
import { activeSeasonYear, isInSeason, seasonWindow } from './season';

describe('activeSeasonYear', () => {
	it('uses the current year from November onwards', () => {
		expect(activeSeasonYear(new Date('2026-11-01T00:00:00Z'))).toBe(2026);
		expect(activeSeasonYear(new Date('2026-12-25T12:00:00Z'))).toBe(2026);
	});

	it('falls back to last season before November', () => {
		expect(activeSeasonYear(new Date('2026-10-19T16:00:00Z'))).toBe(2025);
		expect(activeSeasonYear(new Date('2027-01-02T00:00:00Z'))).toBe(2026);
	});
});

describe('isInSeason', () => {
	const season = seasonWindow(2026);

	it('includes both boundary days', () => {
		expect(isInSeason(new Date('2026-11-01T00:00:00Z'), season)).toBe(true);
		expect(isInSeason(new Date('2026-12-31T23:59:59Z'), season)).toBe(true);
	});

	it('excludes dates outside Nov–Dec', () => {
		expect(isInSeason(new Date('2026-10-31T23:59:59Z'), season)).toBe(false);
		expect(isInSeason(new Date('2027-01-01T00:00:00Z'), season)).toBe(false);
	});
});
