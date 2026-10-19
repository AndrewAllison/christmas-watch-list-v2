import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Better Auth core tables. Field names must match Better Auth's model
 * (verified against `getAuthTables` from better-auth 1.7); columns are
 * snake_cased by the shared `casing` option.
 */

const timestamps = {
	createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp({ withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
};

export const user = pgTable('user', {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: boolean().notNull().default(false),
	image: text(),
	...timestamps
});

export const session = pgTable(
	'session',
	{
		id: text().primaryKey(),
		expiresAt: timestamp({ withTimezone: true }).notNull(),
		token: text().notNull().unique(),
		ipAddress: text(),
		userAgent: text(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		...timestamps
	},
	(t) => [index('session_user_id_idx').on(t.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text().primaryKey(),
		accountId: text().notNull(),
		providerId: text().notNull(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text(),
		refreshToken: text(),
		idToken: text(),
		accessTokenExpiresAt: timestamp({ withTimezone: true }),
		refreshTokenExpiresAt: timestamp({ withTimezone: true }),
		scope: text(),
		password: text(),
		...timestamps
	},
	(t) => [index('account_user_id_idx').on(t.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text().primaryKey(),
		identifier: text().notNull(),
		value: text().notNull(),
		expiresAt: timestamp({ withTimezone: true }).notNull(),
		...timestamps
	},
	(t) => [index('verification_identifier_idx').on(t.identifier)]
);
