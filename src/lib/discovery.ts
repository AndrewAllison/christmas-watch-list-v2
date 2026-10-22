/** Home discovery membership and release-year order. No database. */

export interface DiscoveryTitle {
	id: string;
	title: string;
	year: number | null;
	posterUrl: string | null;
	type: 'movie' | 'tv';
}

/** Latest release year first. A missing year sorts last. Title breaks a tie. */
export function orderByRelease<T extends Pick<DiscoveryTitle, 'year' | 'title'>>(
	titles: readonly T[]
): T[] {
	return titles.toSorted((a, b) => {
		if (a.year == null && b.year == null) return a.title.localeCompare(b.title);
		if (a.year == null) return 1;
		if (b.year == null) return -1;
		if (a.year !== b.year) return b.year - a.year;
		return a.title.localeCompare(b.title);
	});
}

/**
 * Default (`seen` false): titles with no watch event.
 * Seen filter: titles with a watch event that are not on this year's list.
 */
export function filterDiscovery<T extends Pick<DiscoveryTitle, 'id'>>(
	titles: readonly T[],
	seen: boolean,
	watchedIds: ReadonlySet<string>,
	seasonIds: ReadonlySet<string>
): T[] {
	return titles.filter((title) => {
		const watched = watchedIds.has(title.id);
		if (!seen) return !watched;
		return watched && !seasonIds.has(title.id);
	});
}

export const latestShelfCount = 12;

export function takeLatest<T>(titles: readonly T[], count = latestShelfCount): T[] {
	return titles.slice(0, count);
}

/** Case-insensitive title match. An empty query matches nothing, so the shelves stay. */
export function matchTitles<T extends { title: string }>(titles: readonly T[], query: string): T[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return [];
	return titles.filter((title) => title.title.toLowerCase().includes(needle));
}

/** Signed-out requests ignore `seen`. */
export function discoverySeen(signedIn: boolean, raw: string | null): boolean {
	return signedIn && raw === '1';
}

/** Signed out: the whole guide. Signed in: the seen or unseen filter. */
export function discoveryGuide<T extends { id: string }>(
	titles: readonly T[],
	signedIn: boolean,
	seen: boolean,
	watchedIds: ReadonlySet<string>,
	seasonIds: ReadonlySet<string>
): T[] {
	if (!signedIn) return [...titles];
	return filterDiscovery(titles, seen, watchedIds, seasonIds);
}

/** An empty query keeps the guide set. A query narrows it by title. */
export function discoveryResults<T extends { title: string }>(
	titles: readonly T[],
	query: string
): T[] {
	if (!query.trim()) return [...titles];
	return matchTitles(titles, query);
}

export function discoveryNext(query: string, seen: boolean): string {
	const params = new URLSearchParams();
	if (seen) params.set('seen', '1');
	const trimmed = query.trim();
	if (trimmed) params.set('q', trimmed);
	const search = params.toString();
	return search ? `/discovery?${search}` : '/discovery';
}

/** Keep the current page query and name the SvelteKit action. A leading `?` replaces the query, so the action key must be appended. */
export function posterAction(search: string, onSeason: boolean): string {
	const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
	const actionKeys: string[] = [];
	for (const key of params.keys()) {
		if (key.startsWith('/')) actionKeys.push(key);
	}
	for (const key of actionKeys) params.delete(key);
	const query = params.toString();
	const name = onSeason ? '/remove' : '/add';
	return query ? `?${query}&${name}` : `?${name}`;
}

export type DiscoveryStatus =
	| { kind: 'results'; label: string }
	| { kind: 'empty'; label: string }
	| { kind: 'guide' };

/** Heading or empty line for the Discovery grid. A blank query with rows has neither. */
export function discoveryStatus(count: number, query: string, signedIn: boolean): DiscoveryStatus {
	if (query.trim()) {
		if (count === 0) return { kind: 'empty', label: 'No titles match that.' };
		return { kind: 'results', label: count === 1 ? '1 title' : `${count} titles` };
	}
	if (count === 0) {
		return { kind: 'empty', label: signedIn ? 'No titles in this view.' : 'The guide is empty.' };
	}
	return { kind: 'guide' };
}
