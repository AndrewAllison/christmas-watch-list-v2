import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { activeSeasonYear } from '#lib/season.js';
import { isGuideMedia } from '#lib/server/catalogue.js';
import type { Db } from '#lib/server/db/index.js';
import { seasonEntries } from '#lib/server/db/schema.js';

const mediaIdSchema = z.uuid();

type SeasonActionEvent = {
	locals: { user: { id: string } | null; db: () => Promise<Db> };
	request: Request;
	url: URL;
};

/** Add or remove the active season only. Signed-out posts go to sign-in. */
export async function seasonListAction(add: boolean, event: SeasonActionEvent) {
	const next = `${event.url.pathname}${event.url.search}`;
	if (!event.locals.user) redirect(303, `/sign-in?next=${encodeURIComponent(next)}`);
	const form = await event.request.formData();
	const mediaId = mediaIdSchema.safeParse(String(form.get('mediaId') ?? ''));
	if (!mediaId.success) return fail(400, { message: 'Could not save that' });
	const db = await event.locals.db();
	const saved = add
		? await addSeasonEntry(db, event.locals.user.id, mediaId.data, activeSeasonYear())
		: await removeSeasonEntry(db, event.locals.user.id, mediaId.data, activeSeasonYear());
	if (!saved) return fail(404, { message: 'That title is not in the guide' });
	return { ok: true as const };
}

/** Insert this year's row. A duplicate is a success. False when the title is not in the guide. */
export async function addSeasonEntry(db: Db, userId: string, mediaId: string, seasonYear: number) {
	if (!(await isGuideMedia(db, mediaId))) return false;
	await db.insert(seasonEntries).values({ userId, mediaId, seasonYear }).onConflictDoNothing();
	return true;
}

/** Delete this year's row only. Watch events stay. False when the title is not in the guide. */
export async function removeSeasonEntry(
	db: Db,
	userId: string,
	mediaId: string,
	seasonYear: number
) {
	if (!(await isGuideMedia(db, mediaId))) return false;
	await db
		.delete(seasonEntries)
		.where(
			and(
				eq(seasonEntries.userId, userId),
				eq(seasonEntries.mediaId, mediaId),
				eq(seasonEntries.seasonYear, seasonYear)
			)
		);
	return true;
}
