// See https://svelte.dev/docs/kit/types#app.d.ts
// Cloudflare bindings come from `import { env } from 'cloudflare:workers'`
// (adapter-cloudflare 8 has no `event.platform`).
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
