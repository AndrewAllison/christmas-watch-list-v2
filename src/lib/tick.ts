import { z } from 'zod';

/**
 * Tradition Tick payload, shared by the form action and the offline queue.
 * Mirrors `watch_events_precision_check` in the DB schema.
 */
export const tickInput = z.discriminatedUnion('datePrecision', [
	z.object({
		id: z.uuid(),
		mediaId: z.uuid(),
		datePrecision: z.literal('exact'),
		watchedAt: z.coerce.date()
	}),
	z.object({
		id: z.uuid(),
		mediaId: z.uuid(),
		datePrecision: z.literal('year'),
		watchedYear: z.int().min(1900).max(2100)
	}),
	z.object({
		id: z.uuid(),
		mediaId: z.uuid(),
		datePrecision: z.literal('unknown')
	})
]);

export type TickInput = z.infer<typeof tickInput>;
