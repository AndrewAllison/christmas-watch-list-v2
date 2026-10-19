import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/sign-in');
	return { email: locals.user.email };
};

export const actions = {
	default: async ({ locals, request }) => {
		const auth = await locals.auth();
		await auth.api.signOut({ headers: request.headers });
		redirect(303, '/sign-in');
	}
} satisfies Actions;
