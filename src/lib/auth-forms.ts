import { z } from 'zod';

export const emailInput = z.object({
	email: z.string().trim().toLowerCase().pipe(z.email())
});

export const otpInput = emailInput.extend({
	otp: z
		.string()
		.trim()
		.regex(/^\d{6}$/, 'Enter the 6-digit code')
});

/** Only allow same-origin relative paths as post-sign-in destinations. */
export function safeRedirect(target: string | null | undefined, fallback = '/') {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
		return fallback;
	}
	return target;
}
