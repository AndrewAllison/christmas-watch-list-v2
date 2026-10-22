import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export * from './auth-schema';

/*
 * Lean V2 schema: media, watch_events, user_media_state, season_entries (+ Better Auth).
 * season_entries is the per-year list (D25). Ask before adding further tables.
 */

export const mediaType = pgEnum('media_type', ['movie', 'tv']);
export const holidayRelevance = pgEnum('holiday_relevance', [
	'christmas',
	'adjacent',
	'nonRelated'
]);
export const datePrecision = pgEnum('date_precision', ['exact', 'year', 'unknown']);
export const watchSource = pgEnum('watch_source', ['manual', 'import']);

export interface MediaSourceIds {
	tmdb: number;
	imdb?: string;
}

export const media = pgTable(
	'media',
	{
		/** V1 UUIDs are preserved when migrating. */
		id: uuid().primaryKey().defaultRandom(),
		title: text().notNull(),
		year: integer(),
		description: text(),
		posterUrl: text(),
		backdropUrl: text(),
		type: mediaType().notNull(),
		genres: jsonb().$type<string[]>(),
		runtime: integer(),
		sourceIds: jsonb().$type<MediaSourceIds>().notNull(),
		holidayRelevance: holidayRelevance().notNull(),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [index('media_holiday_relevance_idx').on(t.holidayRelevance)]
);

export const watchEvents = pgTable(
	'watch_events',
	{
		/** Clients may mint this UUID for optimistic offline ticks. */
		id: uuid().primaryKey().defaultRandom(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		mediaId: uuid()
			.notNull()
			.references(() => media.id, { onDelete: 'cascade' }),
		watchedAt: timestamp({ withTimezone: true }),
		datePrecision: datePrecision().notNull(),
		watchedYear: integer(),
		source: watchSource().notNull().default('manual'),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('watch_events_user_watched_at_idx').on(t.userId, t.watchedAt),
		index('watch_events_user_media_idx').on(t.userId, t.mediaId),
		check(
			'watch_events_precision_check',
			sql`(${t.datePrecision} <> 'exact' OR ${t.watchedAt} IS NOT NULL)
				AND (${t.datePrecision} <> 'year' OR ${t.watchedYear} IS NOT NULL)`
		)
	]
);

export const userMediaState = pgTable(
	'user_media_state',
	{
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		mediaId: uuid()
			.notNull()
			.references(() => media.id, { onDelete: 'cascade' }),
		/** true = on My List. */
		isFavourite: boolean().notNull().default(false),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [primaryKey({ columns: [t.userId, t.mediaId] })]
);

/** One title chosen for one season year. Not a favourite and not a watch. */
export const seasonEntries = pgTable(
	'season_entries',
	{
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		mediaId: uuid()
			.notNull()
			.references(() => media.id, { onDelete: 'cascade' }),
		seasonYear: integer().notNull(),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.mediaId, t.seasonYear] })]
);

export type Media = typeof media.$inferSelect;
export type WatchEvent = typeof watchEvents.$inferSelect;
export type NewWatchEvent = typeof watchEvents.$inferInsert;
export type UserMediaState = typeof userMediaState.$inferSelect;
