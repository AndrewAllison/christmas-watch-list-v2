import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Old address for the Watched screen. */
export const load: PageServerLoad = () => {
	redirect(308, '/history');
};
