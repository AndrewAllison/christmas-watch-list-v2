/** A real `YYYY-MM-DD` calendar day. A year on its own is not a day. */
export function isCalendarDay(iso: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

const months = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
] as const;

/** `2025-11-22` displays as `22 Nov 2025`. Uses the ISO parts, not local time. */
export function formatReleaseDay(iso: string): string | null {
	if (!isCalendarDay(iso)) return null;
	const [year, month, day] = iso.split('-').map(Number);
	const name = months[month - 1];
	if (!name) return null;
	return `${day} ${name} ${year}`;
}

/**
 * Movie day from TMDB `release_date`. Series day from `first_air_date`.
 * An empty or impossible value yields null so the caller leaves any stored day alone.
 */
export function releaseDayFromTmdb(
	type: 'movie' | 'tv',
	payload: { release_date?: unknown; first_air_date?: unknown }
): string | null {
	const raw = type === 'movie' ? payload.release_date : payload.first_air_date;
	return typeof raw === 'string' && isCalendarDay(raw) ? raw : null;
}
