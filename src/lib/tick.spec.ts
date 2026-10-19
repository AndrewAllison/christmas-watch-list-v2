import { describe, expect, it } from 'vitest';
import { tickInput } from './tick';

const ids = {
	id: '0b6f1c2e-5d1a-4c3e-9f4b-2a7d8e9c1b3a',
	mediaId: '6a1e2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b'
};

describe('tickInput', () => {
	it('accepts an exact tick and coerces the date', () => {
		const parsed = tickInput.parse({
			...ids,
			datePrecision: 'exact',
			watchedAt: '2025-12-25T20:00:00Z'
		});
		expect(parsed.datePrecision === 'exact' && parsed.watchedAt).toBeInstanceOf(Date);
	});

	it('requires a date for exact ticks', () => {
		expect(tickInput.safeParse({ ...ids, datePrecision: 'exact' }).success).toBe(false);
	});

	it('requires a year for year-only ticks', () => {
		expect(tickInput.safeParse({ ...ids, datePrecision: 'year' }).success).toBe(false);
		expect(tickInput.safeParse({ ...ids, datePrecision: 'year', watchedYear: 1998 }).success).toBe(
			true
		);
	});

	it("accepts 'don't remember' with no date", () => {
		expect(tickInput.safeParse({ ...ids, datePrecision: 'unknown' }).success).toBe(true);
	});

	it('rejects non-UUID ids', () => {
		expect(
			tickInput.safeParse({ id: 'nope', mediaId: ids.mediaId, datePrecision: 'unknown' }).success
		).toBe(false);
	});
});
