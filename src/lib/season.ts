/** Season = 1 Nov → 31 Dec (inclusive) of the active Christmas year, in UTC. */
export interface SeasonWindow {
	year: number;
	start: Date;
	end: Date;
}

/** January–October belong to the previous season until 1 Nov rolls round. */
export function activeSeasonYear(now: Date = new Date()): number {
	const year = now.getUTCFullYear();
	return now.getUTCMonth() >= 10 ? year : year - 1;
}

export function seasonWindow(year: number): SeasonWindow {
	return {
		year,
		start: new Date(Date.UTC(year, 10, 1)),
		end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
	};
}

export function isInSeason(date: Date, window: SeasonWindow): boolean {
	const t = date.getTime();
	return t >= window.start.getTime() && t <= window.end.getTime();
}

export type SeasonPhase = 'before' | 'during' | 'after';

/** Where `now` sits inside a season's 1 Nov–31 Dec window. Days are UTC dates. */
export interface SeasonCalendar {
	year: number;
	phase: SeasonPhase;
	/** 0 before the window. 1 on 1 Nov. Clamped to `length` once the season is over. */
	day: number;
	length: number;
	/** Whole days after today. 0 on 31 Dec and after the season. */
	daysLeft: number;
}

const dayMs = 86_400_000;

function utcDateOnly(date: Date): number {
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function seasonCalendar(now: Date, window: SeasonWindow): SeasonCalendar {
	const start = utcDateOnly(window.start);
	const end = utcDateOnly(window.end);
	const today = utcDateOnly(now);
	const length = Math.round((end - start) / dayMs) + 1;
	if (today < start) {
		return { year: window.year, phase: 'before', day: 0, length, daysLeft: length };
	}
	if (today > end) {
		return { year: window.year, phase: 'after', day: length, length, daysLeft: 0 };
	}
	const day = Math.round((today - start) / dayMs) + 1;
	return { year: window.year, phase: 'during', day, length, daysLeft: length - day };
}

export function seasonPhaseLabel(calendar: SeasonCalendar): string {
	switch (calendar.phase) {
		case 'before':
			return 'Starts 1 Nov.';
		case 'during':
			if (calendar.daysLeft === 0) return 'Last day of the season.';
			if (calendar.daysLeft === 1) return '1 day to go.';
			return `${calendar.daysLeft} days to go.`;
		case 'after':
			return 'That season has finished.';
		default: {
			const unreachable: never = calendar.phase;
			return unreachable;
		}
	}
}
