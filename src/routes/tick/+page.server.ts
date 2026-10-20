import { fail, redirect } from '@sveltejs/kit';
import { safeRedirect } from '#lib/auth-forms.js';
import { loadBrowseShelves } from '#lib/server/catalogue.js';
import { recordTick } from '#lib/server/ticks.js';
import { buildTick, parseTickForm, type TickTitle, tickInput } from '#lib/tick.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const db = await locals.db();
	const shelves = await loadBrowseShelves(db);
	const titles: TickTitle[] = [];
	for (const shelf of shelves) {
		for (const item of shelf.items) {
			titles.push({
				id: item.id,
				title: item.title,
				year: item.year,
				posterUrl: item.posterUrl
			});
		}
	}
	return { titles, signedIn: Boolean(locals.user) };
};

export const actions = {
	record: async ({ locals, request }) => {
		const form = await request.formData();
		const next = safeRedirect(String(form.get('next') ?? ''), '/tick');
		if (!locals.user) redirect(303, `/sign-in?next=${encodeURIComponent(next)}`);

		const parsed = parseTickForm({
			choice: form.get('choice'),
			mediaId: form.get('mediaId'),
			watchedOn: form.get('watchedOn'),
			watchedYear: form.get('watchedYear')
		});
		if (!parsed.success) return fail(400, { message: 'Could not save that tick' });

		const tick = tickInput.safeParse(buildTick(parsed.data, crypto.randomUUID(), new Date()));
		if (!tick.success) return fail(400, { message: 'Could not save that tick' });

		const db = await locals.db();
		const saved = await recordTick(db, locals.user.id, tick.data);
		if (!saved) return fail(404, { message: 'That title is not in the guide' });
		redirect(303, next);
	}
} satisfies Actions;
