import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';
import type { PageProps } from './$types';

const codeStep = {
	params: {},
	data: { user: null, next: '/', error: null, emailOtpEnabled: true },
	form: { step: 'code' as const, email: 'a@b.co' }
} satisfies PageProps;

describe('sign-in code field', () => {
	it('renders a six-digit pattern after Svelte compilation', () => {
		const { body } = render(Page, {
			props: codeStep
		});

		expect(body).toContain('pattern="\\d{6}"');
		expect(body).not.toContain('pattern="\\d6"');
	});
});
