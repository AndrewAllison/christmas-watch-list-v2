import { fail, redirect } from '@sveltejs/kit';
import { safeRedirect } from '#lib/auth-forms.js';
import { favouriteToggleInput } from '#lib/my-list.js';
import { loadMyList, setFavourite } from '#lib/server/my-list.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { signedIn: false as const, list: null };
	const db = await locals.db();
	return { signedIn: true as const, list: await loadMyList(db, locals.user.id) };
};

export const actions = {
	toggle: async ({ locals, request }) => {
		const form = await request.formData();
		const next = safeRedirect(String(form.get('next') ?? ''), '/my-list');
		if (!locals.user) redirect(303, `/sign-in?next=${encodeURIComponent(next)}`);

		const parsed = favouriteToggleInput.safeParse({
			mediaId: form.get('mediaId'),
			onList: form.get('onList')
		});
		if (!parsed.success) return fail(400, { message: 'Could not update your list' });

		const db = await locals.db();
		const updated = await setFavourite(db, locals.user.id, parsed.data.mediaId, parsed.data.onList);
		if (!updated) return fail(404, { message: 'That title is not in the guide' });
		redirect(303, next);
	}
} satisfies Actions;
