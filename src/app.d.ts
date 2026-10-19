// See https://svelte.dev/docs/kit/types#app.d.ts
// Cloudflare bindings come from `import { env } from 'cloudflare:workers'`
// (adapter-cloudflare 8 has no `event.platform`).
import type { Auth, Session } from '#lib/server/auth.js';
import type { Db } from '#lib/server/db/index.js';

declare global {
	namespace Cloudflare {
		interface Env {
			/** Resend sender, e.g. `Name <noreply@verified-domain>`. Unset = Email OTP disabled. */
			EMAIL_FROM?: string;
		}
	}

	namespace App {
		// interface Error {}
		interface Locals {
			/** Per-request Drizzle client, connected on first call and closed after the response. */
			db: () => Promise<Db>;
			/** Per-request Better Auth instance (shares `db`). */
			auth: () => Promise<Auth>;
			user: Session['user'] | null;
			session: Session['session'] | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
