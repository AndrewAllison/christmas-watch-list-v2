/** Lifetime watch log. One row per title, newest activity first. */

export interface HistoryEvent {
	mediaId: string;
	title: string;
	year: number | null;
	posterUrl: string | null;
	createdAt: Date;
}

export interface HistoryRow {
	id: string;
	title: string;
	year: number | null;
	posterUrl: string | null;
	count: number;
	latestAt: Date;
}

export function groupHistory(events: readonly HistoryEvent[]): HistoryRow[] {
	const byId = new Map<string, HistoryRow>();
	for (const event of events) {
		const existing = byId.get(event.mediaId);
		if (!existing) {
			byId.set(event.mediaId, {
				id: event.mediaId,
				title: event.title,
				year: event.year,
				posterUrl: event.posterUrl,
				count: 1,
				latestAt: event.createdAt
			});
			continue;
		}
		existing.count += 1;
		if (event.createdAt > existing.latestAt) existing.latestAt = event.createdAt;
	}
	return [...byId.values()].toSorted((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
}
