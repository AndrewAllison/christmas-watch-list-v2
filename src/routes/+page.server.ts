import { loadBrowseShelves } from '#lib/server/catalogue.js';
import { loadFavouriteIds } from '#lib/server/my-list.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const db = await locals.db();
	const shelves = await loadBrowseShelves(db);
	const favouriteIds = locals.user ? await loadFavouriteIds(db, locals.user.id) : new Set<string>();
	for (const shelf of shelves) {
		for (const item of shelf.items) item.onList = favouriteIds.has(item.id);
	}
	return { shelves };
};
