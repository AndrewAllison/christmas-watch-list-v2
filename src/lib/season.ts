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
