import { describe, expect, it } from 'vitest';
import { activeSeasonYear, isInSeason, seasonWindow } from './season';
import { buildTick, filterTickTitles, parseTickForm, type TickTitle, tickInput } from './tick';

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

const mediaId = ids.mediaId;
const tickId = ids.id;

describe('parseTickForm', () => {
	it('accepts the preset choices with only a media id', () => {
		for (const choice of ['just-watched', 'christmas-day', 'boxing-day', 'unknown'] as const) {
			expect(parseTickForm({ choice, mediaId, watchedOn: 'nope' }).success).toBe(true);
		}
	});

	it('requires a real calendar day for pick-a-date', () => {
		expect(parseTickForm({ choice: 'pick-date', mediaId, watchedOn: '2024-02-29' }).success).toBe(
			true
		);
		expect(parseTickForm({ choice: 'pick-date', mediaId, watchedOn: '2025-02-29' }).success).toBe(
			false
		);
		expect(parseTickForm({ choice: 'pick-date', mediaId, watchedOn: '2025-12-32' }).success).toBe(
			false
		);
		expect(parseTickForm({ choice: 'pick-date', mediaId }).success).toBe(false);
	});

	it('requires a year between 1900 and 2100', () => {
		expect(parseTickForm({ choice: 'year', mediaId, watchedYear: '1992' }).success).toBe(true);
		expect(parseTickForm({ choice: 'year', mediaId, watchedYear: '1899' }).success).toBe(false);
		expect(parseTickForm({ choice: 'year', mediaId, watchedYear: '2101' }).success).toBe(false);
	});
});

describe('buildTick', () => {
	const october = new Date('2026-10-20T15:04:00.000Z');
	const november = new Date('2026-11-02T15:04:00.000Z');

	it('stores just watched as the request time', () => {
		const tick = buildTick({ choice: 'just-watched', mediaId }, tickId, october);
		expect(tickInput.safeParse(tick).success).toBe(true);
		expect(tick).toMatchObject({ datePrecision: 'exact', watchedAt: october });
	});

	it('places Christmas Day and Boxing Day in the active season', () => {
		const christmas = buildTick({ choice: 'christmas-day', mediaId }, tickId, october);
		const boxing = buildTick({ choice: 'boxing-day', mediaId }, tickId, october);
		expect(christmas).toMatchObject({
			datePrecision: 'exact',
			watchedAt: new Date('2025-12-25T12:00:00.000Z')
		});
		expect(boxing).toMatchObject({
			datePrecision: 'exact',
			watchedAt: new Date('2025-12-26T12:00:00.000Z')
		});
		const season = seasonWindow(activeSeasonYear(october));
		expect(christmas.datePrecision === 'exact' && isInSeason(christmas.watchedAt, season)).toBe(
			true
		);
		expect(boxing.datePrecision === 'exact' && isInSeason(boxing.watchedAt, season)).toBe(true);

		const nextSeason = buildTick({ choice: 'christmas-day', mediaId }, tickId, november);
		expect(nextSeason).toMatchObject({ watchedAt: new Date('2026-12-25T12:00:00.000Z') });
	});

	it('stores a picked date at noon UTC', () => {
		const parsed = parseTickForm({ choice: 'pick-date', mediaId, watchedOn: '2025-12-24' });
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		const tick = buildTick(parsed.data, tickId, october);
		expect(tick).toMatchObject({
			datePrecision: 'exact',
			watchedAt: new Date('2025-12-24T12:00:00.000Z')
		});
	});

	it('stores a year-only tick and a forgotten one', () => {
		const year = parseTickForm({ choice: 'year', mediaId, watchedYear: '1992' });
		expect(year.success).toBe(true);
		if (!year.success) return;
		expect(buildTick(year.data, tickId, october)).toMatchObject({
			datePrecision: 'year',
			watchedYear: 1992
		});
		expect(buildTick({ choice: 'unknown', mediaId }, tickId, october)).toEqual({
			id: tickId,
			mediaId,
			datePrecision: 'unknown'
		});
	});
});

describe('filterTickTitles', () => {
	const titles: TickTitle[] = [
		{ id: '1', title: 'Elf', year: 2003, posterUrl: null },
		{ id: '2', title: 'The Muppet Christmas Carol', year: 1992, posterUrl: null }
	];

	it('shows nothing until there is a query', () => {
		expect(filterTickTitles(titles, '')).toEqual([]);
		expect(filterTickTitles(titles, '   ')).toEqual([]);
	});

	it('matches a title regardless of case', () => {
		expect(filterTickTitles(titles, 'muppet').map((item) => item.title)).toEqual([
			'The Muppet Christmas Carol'
		]);
		expect(filterTickTitles(titles, 'ELF')).toHaveLength(1);
		expect(filterTickTitles(titles, 'snowman')).toEqual([]);
	});
});
