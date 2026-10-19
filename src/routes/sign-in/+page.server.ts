import { env } from 'cloudflare:workers';
import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { emailInput, otpInput, safeRedirect } from '#lib/auth-forms.js';
import { EMAIL_OTP_DISABLED_MESSAGE, isEmailOtpEnabled } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

function authErrorMessage(error: unknown, fallback: string) {
	if (error instanceof APIError) return error.body?.message ?? fallback;
	console.error(error);
	return fallback;
}

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeRedirect(url.searchParams.get('next'));
	if (locals.user) redirect(303, next);
	return {
		next,
		error: url.searchParams.get('error'),
		emailOtpEnabled: isEmailOtpEnabled(env)
	};
};

export const actions = {
	google: async ({ locals, request, url }) => {
		const next = safeRedirect(url.searchParams.get('next'));
		let target: string | undefined;
		try {
			const auth = await locals.auth();
			const result = await auth.api.signInSocial({
				body: { provider: 'google', callbackURL: next, errorCallbackURL: '/sign-in' },
				headers: request.headers
			});
			target = result.url;
		} catch (error) {
			return fail(500, {
				step: 'email' as const,
				message: authErrorMessage(error, 'Google sign-in failed')
			});
		}
		if (!target) return fail(500, { step: 'email' as const, message: 'Google sign-in failed' });
		redirect(303, target, { external: ['https://accounts.google.com'] });
	},

	sendCode: async ({ locals, request }) => {
		if (!isEmailOtpEnabled(env)) {
			return fail(503, { step: 'email' as const, message: EMAIL_OTP_DISABLED_MESSAGE });
		}
		const parsed = emailInput.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { step: 'email' as const, message: 'Enter a valid email address' });
		}
		const { email } = parsed.data;
		try {
			const auth = await locals.auth();
			await auth.api.sendVerificationOTP({ body: { email, type: 'sign-in' } });
		} catch (error) {
			return fail(502, {
				step: 'email' as const,
				email,
				message: authErrorMessage(error, "Couldn't send the code. Try again.")
			});
		}
		return { step: 'code' as const, email };
	},

	verifyCode: async ({ locals, request, url }) => {
		const form = await request.formData();
		const parsed = otpInput.safeParse(Object.fromEntries(form));
		if (!parsed.success) {
			return fail(400, {
				step: 'code' as const,
				email: String(form.get('email') ?? ''),
				message: 'Enter the 6-digit code'
			});
		}
		const { email, otp } = parsed.data;
		try {
			const auth = await locals.auth();
			await auth.api.signInEmailOTP({ body: { email, otp }, headers: request.headers });
		} catch (error) {
			return fail(400, {
				step: 'code' as const,
				email,
				message: authErrorMessage(error, 'That code didn’t work')
			});
		}
		redirect(303, safeRedirect(url.searchParams.get('next')));
	}
} satisfies Actions;
