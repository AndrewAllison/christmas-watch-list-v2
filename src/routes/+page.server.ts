import { loadBrowseShelves } from '#lib/server/catalogue.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const db = await locals.db();
	return { shelves: await loadBrowseShelves(db) };
};
