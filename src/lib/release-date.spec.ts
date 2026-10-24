import { describe, expect, it } from 'vitest';
import { formatReleaseDay, releaseDayFromTmdb } from './release-date';

describe('releaseDayFromTmdb', () => {
	it('keeps a real movie release day and ignores the series field', () => {
		expect(
			releaseDayFromTmdb('movie', { release_date: '2025-11-22', first_air_date: '1999-01-01' })
		).toBe('2025-11-22');
	});

	it('keeps a real series first-air day and ignores the movie field', () => {
		expect(
			releaseDayFromTmdb('tv', { release_date: '2025-11-22', first_air_date: '2011-12-01' })
		).toBe('2011-12-01');
	});

	it('keeps a leap day and drops empty, partial, and impossible days', () => {
		expect(releaseDayFromTmdb('movie', { release_date: '2024-02-29' })).toBe('2024-02-29');
		expect(releaseDayFromTmdb('movie', {})).toBeNull();
		expect(releaseDayFromTmdb('movie', { release_date: '' })).toBeNull();
		expect(releaseDayFromTmdb('movie', { release_date: '2025' })).toBeNull();
		expect(releaseDayFromTmdb('movie', { release_date: '2025-02-29' })).toBeNull();
		expect(releaseDayFromTmdb('tv', { first_air_date: '2025-11-31' })).toBeNull();
	});
});

describe('formatReleaseDay', () => {
	it('formats the calendar parts with no leading zero', () => {
		expect(formatReleaseDay('2025-11-22')).toBe('22 Nov 2025');
		expect(formatReleaseDay('2025-11-01')).toBe('1 Nov 2025');
	});

	it('drops a day that is not a real calendar day', () => {
		expect(formatReleaseDay('2025-02-29')).toBeNull();
	});
});
