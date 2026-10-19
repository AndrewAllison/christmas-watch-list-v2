import { describe, expect, it } from 'vitest';
import { emailInput, otpInput, safeRedirect } from './auth-forms';

describe('emailInput', () => {
	it('trims and lower-cases', () => {
		expect(emailInput.parse({ email: '  Andrew@Example.COM ' }).email).toBe('andrew@example.com');
	});

	it('rejects non-emails', () => {
		expect(emailInput.safeParse({ email: 'nope' }).success).toBe(false);
	});
});

describe('otpInput', () => {
	it('accepts a 6-digit code', () => {
		expect(otpInput.safeParse({ email: 'a@b.co', otp: ' 123456 ' }).success).toBe(true);
	});

	it('rejects short or non-numeric codes', () => {
		expect(otpInput.safeParse({ email: 'a@b.co', otp: '12345' }).success).toBe(false);
		expect(otpInput.safeParse({ email: 'a@b.co', otp: '12a456' }).success).toBe(false);
	});
});

describe('safeRedirect', () => {
	it('keeps same-origin paths', () => {
		expect(safeRedirect('/my-list')).toBe('/my-list');
	});

	it('falls back for missing, absolute or protocol-relative targets', () => {
		expect(safeRedirect(null)).toBe('/');
		expect(safeRedirect('https://evil.example')).toBe('/');
		expect(safeRedirect('//evil.example')).toBe('/');
		expect(safeRedirect('/\\evil.example')).toBe('/');
	});
});
