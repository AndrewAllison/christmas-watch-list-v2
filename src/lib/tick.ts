import { z } from 'zod';
import { isCalendarDay } from '#lib/release-date.js';
import { activeSeasonYear } from '#lib/season.js';

/**
 * Tradition Tick payload, shared by the form action and the offline queue.
 * Mirrors `watch_events_precision_check` in the DB schema.
 */
export const tickInput = z.discriminatedUnion('datePrecision', [
	z.object({
		id: z.uuid(),
		mediaId: z.uuid(),
		datePrecision: z.literal('exact'),
		watchedAt: z.coerce.date()
	}),
	z.object({
		id: z.uuid(),
		mediaId: z.uuid(),
		datePrecision: z.literal('year'),
		watchedYear: z.int().min(1900).max(2100)
	}),
	z.object({
		id: z.uuid(),
		mediaId: z.uuid(),
		datePrecision: z.literal('unknown')
	})
]);

export type TickInput = z.infer<typeof tickInput>;

/** A catalogue row the Tick tab can filter. */
export interface TickTitle {
	id: string;
	title: string;
	year: number | null;
	posterUrl: string | null;
}

/** What the panel asks, before it becomes a stored tick. */
export const tickFormInput = z.discriminatedUnion('choice', [
	z.object({ choice: z.literal('just-watched'), mediaId: z.uuid() }),
	z.object({ choice: z.literal('christmas-day'), mediaId: z.uuid() }),
	z.object({ choice: z.literal('boxing-day'), mediaId: z.uuid() }),
	z.object({
		choice: z.literal('pick-date'),
		mediaId: z.uuid(),
		watchedOn: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.refine(isCalendarDay, 'Pick a real date')
	}),
	z.object({
		choice: z.literal('year'),
		mediaId: z.uuid(),
		watchedYear: z.coerce.number().pipe(z.int().min(1900).max(2100))
	}),
	z.object({ choice: z.literal('unknown'), mediaId: z.uuid() }),
	z.object({ choice: z.literal('release-date'), mediaId: z.uuid() })
]);

export type TickForm = z.infer<typeof tickFormInput>;

const tickChoice = z.enum([
	'just-watched',
	'christmas-day',
	'boxing-day',
	'pick-date',
	'year',
	'unknown',
	'release-date'
]);

/** Read a Tradition Tick form. Date and year fields only apply to those choices. */
export function parseTickForm(fields: {
	choice: unknown;
	mediaId: unknown;
	watchedOn?: unknown;
	watchedYear?: unknown;
}) {
	const choice = tickChoice.safeParse(fields.choice);
	if (!choice.success) {
		return tickFormInput.safeParse({ choice: fields.choice, mediaId: fields.mediaId });
	}
	const picked = choice.data;
	switch (picked) {
		case 'pick-date':
			return tickFormInput.safeParse({
				choice: picked,
				mediaId: fields.mediaId,
				watchedOn: fields.watchedOn
			});
		case 'year':
			return tickFormInput.safeParse({
				choice: picked,
				mediaId: fields.mediaId,
				watchedYear: fields.watchedYear
			});
		case 'just-watched':
		case 'christmas-day':
		case 'boxing-day':
		case 'unknown':
		case 'release-date':
			return tickFormInput.safeParse({ choice: picked, mediaId: fields.mediaId });
		default: {
			const unreachable: never = picked;
			return unreachable;
		}
	}
}

/** Noon UTC, so a calendar day does not drift across time zones. */
export function utcNoon(year: number, monthIndex: number, day: number): Date {
	return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
}

/**
 * Map a panel choice onto the stored tick.
 * Christmas Day and Boxing Day are 25 and 26 Dec of the active season year.
 * Release date is resolved from the catalogue via `exactWatchOnReleaseDay`.
 */
export function buildTick(
	form: Exclude<TickForm, { choice: 'release-date' }>,
	id: string,
	now: Date
): TickInput {
	const mediaId = form.mediaId;
	const seasonYear = activeSeasonYear(now);
	switch (form.choice) {
		case 'just-watched':
			return { id, mediaId, datePrecision: 'exact', watchedAt: now };
		case 'christmas-day':
			return { id, mediaId, datePrecision: 'exact', watchedAt: utcNoon(seasonYear, 11, 25) };
		case 'boxing-day':
			return { id, mediaId, datePrecision: 'exact', watchedAt: utcNoon(seasonYear, 11, 26) };
		case 'pick-date': {
			const [year, month, day] = form.watchedOn.split('-').map(Number);
			return { id, mediaId, datePrecision: 'exact', watchedAt: utcNoon(year, month - 1, day) };
		}
		case 'year':
			return { id, mediaId, datePrecision: 'year', watchedYear: form.watchedYear };
		case 'unknown':
			return { id, mediaId, datePrecision: 'unknown' };
		default: {
			const unreachable: never = form;
			return unreachable;
		}
	}
}

/** An exact watch at noon UTC on the catalogue release day. Null when that day is missing. */
export function exactWatchOnReleaseDay(
	id: string,
	mediaId: string,
	isoDate: string | null
): TickInput | null {
	if (!isoDate || !isCalendarDay(isoDate)) return null;
	const [year, month, day] = isoDate.split('-').map(Number);
	return { id, mediaId, datePrecision: 'exact', watchedAt: utcNoon(year, month - 1, day) };
}

/**
 * Title filter for the Tick tab. An empty query matches nothing, so the
 * guide is not dumped onto the page.
 */
export function filterTickTitles(items: TickTitle[], query: string): TickTitle[] {
	const needle = query.trim().toLocaleLowerCase();
	if (!needle) return [];
	return items.filter((item) => item.title.toLocaleLowerCase().includes(needle));
}
