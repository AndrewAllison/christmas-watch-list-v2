import type { ListTitle, MyListView } from '#lib/my-list.js';
import { type SeasonCalendar, seasonPhaseLabel } from '#lib/season.js';

export interface SeasonTitle {
	id: string;
	title: string;
	year: number | null;
	posterUrl: string | null;
}

export interface SeasonListProgress {
	watched: number;
	total: number;
	label: string;
	stillToWatch: SeasonTitle[];
	watchedTitles: SeasonTitle[];
}

export interface SeasonView {
	calendar: SeasonCalendar;
	phaseLabel: string;
	list: SeasonListProgress | null;
}

function titleOf(item: ListTitle): SeasonTitle {
	return { id: item.id, title: item.title, year: item.year, posterUrl: item.posterUrl };
}

export function listProgressLabel(watched: number, total: number): string {
	if (total === 0) return 'Nothing on your list yet.';
	return `${watched} of ${total} watched.`;
}

/** Favourites already split for this season, plus where today sits in that window. */
export function describeSeason(list: MyListView, calendar: SeasonCalendar): SeasonView {
	const watched = list.watched.length;
	const total = watched + list.stillToWatch.length;
	return {
		calendar,
		phaseLabel: seasonPhaseLabel(calendar),
		list: {
			watched,
			total,
			label: listProgressLabel(watched, total),
			stillToWatch: list.stillToWatch.map(titleOf),
			watchedTitles: list.watched.map(titleOf)
		}
	};
}

export function describeSeasonClock(calendar: SeasonCalendar): SeasonView {
	return { calendar, phaseLabel: seasonPhaseLabel(calendar), list: null };
}
