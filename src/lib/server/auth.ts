import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import * as authSchema from './db/auth-schema';
import type { Db } from './db/index';
import { sendOtpEmail } from './email';

export const AUTH_BASE_PATH = '/api/auth';
export const OTP_EXPIRES_IN_SECONDS = 600;

export type AuthEnv = Record<
	'BETTER_AUTH_URL' | 'BETTER_AUTH_SECRET' | 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET',
	string
> & { RESEND_API_KEY?: string; EMAIL_FROM?: string };

export const EMAIL_OTP_DISABLED_MESSAGE = "Email sign-in isn't set up yet. Use Google for now.";

/** Email OTP needs both a Resend key and a sender on a Resend-verified domain. */
export function isEmailOtpEnabled(env: Pick<AuthEnv, 'RESEND_API_KEY' | 'EMAIL_FROM'>) {
	return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

/**
 * Build Better Auth for one request. Workers can't share the DB client across
 * requests, so the instance (bound to that client) can't be module-scoped either.
 */
export function createAuth(db: Db, env: AuthEnv) {
	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		basePath: AUTH_BASE_PATH,
		secret: env.BETTER_AUTH_SECRET,
		trustedOrigins: [env.BETTER_AUTH_URL],
		database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
				prompt: 'select_account'
			}
		},
		session: {
			// Signed session snapshot in a cookie: most page loads skip the DB entirely.
			cookieCache: { enabled: true, maxAge: 5 * 60 }
		},
		onAPIError: { errorURL: '/sign-in' },
		advanced: {
			ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] }
		},
		telemetry: { enabled: false },
		plugins: [
			emailOTP({
				otpLength: 6,
				expiresIn: OTP_EXPIRES_IN_SECONDS,
				storeOTP: 'hashed',
				async sendVerificationOTP({ email, otp, type }) {
					if (type !== 'sign-in') return;
					if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
						throw new APIError('SERVICE_UNAVAILABLE', { message: EMAIL_OTP_DISABLED_MESSAGE });
					}
					await sendOtpEmail({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }, email, otp);
				}
			}),
			// Must stay last: copies Better Auth's Set-Cookie headers onto SvelteKit's `cookies`.
			sveltekitCookies(getRequestEvent)
		]
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth['$Infer']['Session'];
