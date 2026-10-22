import { fail, redirect } from '@sveltejs/kit';
import { safeRedirect } from '#lib/auth-forms.js';
import { groupHistory } from '#lib/history-log.js';
import { historyEvents, loadWatches } from '#lib/server/library.js';
import { recordTick } from '#lib/server/ticks.js';
import { buildTick, parseTickForm, tickInput } from '#lib/tick.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/sign-in?next=${encodeURIComponent(url.pathname)}`);
	const db = await locals.db();
	const rows = groupHistory(historyEvents(await loadWatches(db, locals.user.id)));
	return {
		rows: rows.map((row) => ({
			id: row.id,
			title: row.title,
			year: row.year,
			posterUrl: row.posterUrl,
			count: row.count
		}))
	};
};

export const actions = {
	record: async ({ locals, request }) => {
		const form = await request.formData();
		const next = safeRedirect(String(form.get('next') ?? ''), '/history');
		if (!locals.user) redirect(303, `/sign-in?next=${encodeURIComponent(next)}`);

		const parsed = parseTickForm({
			choice: form.get('choice'),
			mediaId: form.get('mediaId'),
			watchedOn: form.get('watchedOn'),
			watchedYear: form.get('watchedYear')
		});
		if (!parsed.success) return fail(400, { message: 'Could not save that' });

		const tick = tickInput.safeParse(buildTick(parsed.data, crypto.randomUUID(), new Date()));
		if (!tick.success) return fail(400, { message: 'Could not save that' });

		const db = await locals.db();
		const saved = await recordTick(db, locals.user.id, tick.data);
		if (!saved) return fail(404, { message: 'That title is not in the guide' });
		redirect(303, next);
	}
} satisfies Actions;
