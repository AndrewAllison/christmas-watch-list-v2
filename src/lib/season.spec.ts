import { describe, expect, it } from 'vitest';
import {
	activeSeasonYear,
	isInSeason,
	seasonCalendar,
	seasonPhaseLabel,
	seasonWindow
} from './season';

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

describe('seasonCalendar', () => {
	const season = seasonWindow(2026);

	it('counts 61 days from 1 Nov through 31 Dec', () => {
		const opening = seasonCalendar(new Date('2026-11-01T00:00:00Z'), season);
		expect(opening).toMatchObject({ phase: 'during', day: 1, length: 61, daysLeft: 60 });
		expect(seasonPhaseLabel(opening)).toBe('60 days to go.');

		const christmas = seasonCalendar(new Date('2026-12-25T18:00:00Z'), season);
		expect(christmas).toMatchObject({ phase: 'during', day: 55, daysLeft: 6 });

		const closing = seasonCalendar(new Date('2026-12-31T23:59:59Z'), season);
		expect(closing).toMatchObject({ phase: 'during', day: 61, daysLeft: 0 });
		expect(seasonPhaseLabel(closing)).toBe('Last day of the season.');
	});

	it('reads finished before November, because that season is last year', () => {
		const calendar = seasonCalendar(new Date('2026-10-20T15:00:00Z'), seasonWindow(2025));
		expect(calendar).toMatchObject({
			year: 2025,
			phase: 'after',
			day: 61,
			length: 61,
			daysLeft: 0
		});
		expect(seasonPhaseLabel(calendar)).toBe('That season has finished.');
	});

	it('reads not started when the window is still ahead', () => {
		const calendar = seasonCalendar(new Date('2026-10-31T23:00:00Z'), season);
		expect(calendar.phase).toBe('before');
		expect(seasonPhaseLabel(calendar)).toBe('Starts 1 Nov.');
		expect(seasonPhaseLabel(seasonCalendar(new Date('2026-12-30T12:00:00Z'), season))).toBe(
			'1 day to go.'
		);
	});
});
