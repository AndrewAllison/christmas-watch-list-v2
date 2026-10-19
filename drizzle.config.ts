import { defineConfig } from 'drizzle-kit';

// Migrations run from Node against Neon directly (not via Hyperdrive).
// Point DATABASE_URL at the V2 Neon database/branch — never V1 production.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	casing: 'snake_case',
	dbCredentials: {
		url: process.env.DATABASE_URL ?? ''
	},
	strict: true,
	verbose: true
});
