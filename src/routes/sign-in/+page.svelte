<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let pending = $state(false);
	const step = $derived(form?.step ?? 'email');
	const email = $derived(form && 'email' in form ? form.email : '');
	const message = $derived(
		form?.message ?? (data.error ? 'Sign-in was cancelled or failed. Try again.' : null)
	);
	const query = $derived(data.next === '/' ? '' : `&next=${encodeURIComponent(data.next)}`);

	const submitting = () => {
		pending = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			pending = false;
		};
	};

	const inputClass =
		'h-11 w-full rounded-md border border-input bg-midnight-deep px-3 text-base text-paper placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
</script>

<svelte:head><title>Sign in · Christmas Watch List</title></svelte:head>

<section class="space-y-4">
	<h2 class="text-2xl font-bold tracking-tight">Sign in</h2>

	<Card.Root>
		<Card.Header>
			<Card.Title>Keep your traditions in one place</Card.Title>
			<Card.Description>
				{data.emailOtpEnabled
					? "Use Google, or we'll email you a 6-digit code."
					: 'Sign in with Google. Email codes are coming soon.'}
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			{#if message}
				<p
					role="alert"
					class="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive"
				>
					{message}
				</p>
			{/if}

			<!-- Full-page POST: the action redirects off-site to Google. -->
			<form method="POST" action="?/google{query}" onsubmit={() => (pending = true)}>
				<Button type="submit" class="h-11 w-full" disabled={pending}>Continue with Google</Button>
			</form>

			<div class="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
				<span class="h-px flex-1 bg-border"></span>or<span class="h-px flex-1 bg-border"></span>
			</div>

			{#if !data.emailOtpEnabled}
				<p class="text-sm text-muted-foreground">Email sign-in isn't set up yet.</p>
			{:else if step === 'code'}
				<form method="POST" action="?/verifyCode{query}" class="space-y-3" use:enhance={submitting}>
					<p class="text-sm text-muted-foreground">
						We sent a code to <strong class="text-paper">{email}</strong>. It expires in 10 minutes.
					</p>
					<input type="hidden" name="email" value={email}>
					<label class="block space-y-1.5">
						<span class="text-sm font-medium">6-digit code</span>
						<input
							name="otp"
							inputmode="numeric"
							autocomplete="one-time-code"
							pattern={'\\d{6}'}
							maxlength="6"
							required
							class="{inputClass} tracking-[0.4em]"
						>
					</label>
					<Button type="submit" variant="secondary" class="h-11 w-full" disabled={pending}>
						Sign in
					</Button>
				</form>
				<form method="POST" action="?/sendCode{query}" use:enhance={submitting}>
					<input type="hidden" name="email" value={email}>
					<Button type="submit" variant="link" class="px-0" disabled={pending}
						>Send a new code</Button
					>
				</form>
			{:else}
				<form method="POST" action="?/sendCode{query}" class="space-y-3" use:enhance={submitting}>
					<label class="block space-y-1.5">
						<span class="text-sm font-medium">Email</span>
						<input
							name="email"
							type="email"
							autocomplete="email"
							required
							value={email}
							class={inputClass}
						>
					</label>
					<Button type="submit" variant="secondary" class="h-11 w-full" disabled={pending}>
						Email me a code
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
