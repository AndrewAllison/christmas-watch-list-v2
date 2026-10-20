export const browseShelves = [
	{ relevance: 'christmas', title: 'Christmas' },
	{ relevance: 'adjacent', title: 'On the edge of Christmas' }
] as const;

export type BrowseRelevance = (typeof browseShelves)[number]['relevance'];

export interface BrowseItem {
	id: string;
	title: string;
	year: number | null;
	posterUrl: string | null;
	type: 'movie' | 'tv';
	holidayRelevance: BrowseRelevance | 'nonRelated';
}

export interface BrowseShelf {
	relevance: BrowseRelevance;
	title: string;
	items: BrowseItem[];
}

/** Christmas first, then adjacent. Shelves with nothing on them are left out. */
export function groupBrowseShelves(items: BrowseItem[]): BrowseShelf[] {
	return browseShelves.flatMap((shelf) => {
		const onShelf = items.filter((item) => item.holidayRelevance === shelf.relevance);
		if (onShelf.length === 0) return [];
		return [{ ...shelf, items: onShelf }];
	});
}
