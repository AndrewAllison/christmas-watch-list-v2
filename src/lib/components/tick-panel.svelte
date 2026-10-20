<script lang="ts">
	import { tick } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { activeSeasonYear } from '#lib/season.js';
	import { type ActionResult, enhance } from '$app/forms';

	let { next }: { next: string } = $props();

	let dialog = $state<HTMLDialogElement | null>(null);
	let item = $state<{ id: string; title: string } | null>(null);
	let error = $state('');
	let pending = $state(false);

	const seasonYear = activeSeasonYear();
	const defaultDay = `${seasonYear}-12-25`;
	const quickChoices = [
		{ choice: 'just-watched', label: 'Just watched', hint: '' },
		{ choice: 'christmas-day', label: 'Christmas Day', hint: `25 Dec ${seasonYear}` },
		{ choice: 'boxing-day', label: 'Boxing Day', hint: `26 Dec ${seasonYear}` }
	];
	const inputClass =
		'h-11 w-full rounded-md border border-input bg-midnight-deep px-3 text-base text-paper focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

	export async function open(target: { id: string; title: string }) {
		item = target;
		error = '';
		await tick();
		if (!dialog || dialog.open) return;
		dialog.showModal();
	}

	function close() {
		dialog?.close();
	}

	function handleDialogClose() {
		item = null;
		error = '';
		pending = false;
	}

	function failureMessage(data: unknown) {
		if (
			data &&
			typeof data === 'object' &&
			'message' in data &&
			typeof data.message === 'string' &&
			data.message
		) {
			return data.message;
		}
		return 'Could not save that tick';
	}

	function saveTick() {
		pending = true;
		return async ({ result, update }: { result: ActionResult; update: () => Promise<void> }) => {
			pending = false;
			switch (result.type) {
				case 'failure':
					error = failureMessage(result.data);
					return;
				case 'error':
					error = 'Could not save that tick';
					return;
				case 'redirect':
				case 'success':
					error = '';
					dialog?.close();
					await update();
					return;
				default: {
					const unreachable: never = result;
					return unreachable;
				}
			}
		};
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="tick-title"
	class="text-card-foreground"
	onclose={handleDialogClose}
>
	{#if item}
		{#key item.id}
			<div class="space-y-4">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Tradition tick</p>
						<h2 id="tick-title" class="text-xl font-bold tracking-tight">{item.title}</h2>
						<p class="text-sm text-muted-foreground">This season is Nov–Dec {seasonYear}.</p>
					</div>
					<Button type="button" variant="ghost" class="min-h-11 shrink-0" onclick={close}>
						Close
					</Button>
				</div>

				{#if error}
					<p role="alert" class="text-sm text-destructive">{error}</p>
				{/if}

				<div class="grid gap-2">
					{#each quickChoices as choice (choice.choice)}
						<form method="POST" action="/tick?/record" use:enhance={saveTick}>
							<input type="hidden" name="mediaId" value={item.id}>
							<input type="hidden" name="choice" value={choice.choice}>
							<input type="hidden" name="next" value={next}>
							<Button
								type="submit"
								variant="outline"
								class="min-h-11 w-full justify-between"
								disabled={pending}
							>
								{choice.label}
								{#if choice.hint}
									<span class="text-xs text-muted-foreground">{choice.hint}</span>
								{/if}
							</Button>
						</form>
					{/each}
				</div>

				<form method="POST" action="/tick?/record" class="space-y-2" use:enhance={saveTick}>
					<input type="hidden" name="mediaId" value={item.id}>
					<input type="hidden" name="choice" value="pick-date">
					<input type="hidden" name="next" value={next}>
					<label for="watched-on" class="text-sm font-medium">Pick a date</label>
					<input
						id="watched-on"
						class={inputClass}
						type="date"
						name="watchedOn"
						required
						value={defaultDay}
						disabled={pending}
					>
					<Button type="submit" variant="outline" class="min-h-11 w-full" disabled={pending}>
						Tick this date
					</Button>
				</form>

				<form method="POST" action="/tick?/record" class="space-y-2" use:enhance={saveTick}>
					<input type="hidden" name="mediaId" value={item.id}>
					<input type="hidden" name="choice" value="year">
					<input type="hidden" name="next" value={next}>
					<label for="watched-year" class="text-sm font-medium">Year only</label>
					<input
						id="watched-year"
						class={inputClass}
						type="number"
						name="watchedYear"
						required
						min="1900"
						max="2100"
						inputmode="numeric"
						value={seasonYear}
						disabled={pending}
					>
					<Button type="submit" variant="outline" class="min-h-11 w-full" disabled={pending}>
						Tick this year
					</Button>
				</form>

				<form method="POST" action="/tick?/record" use:enhance={saveTick}>
					<input type="hidden" name="mediaId" value={item.id}>
					<input type="hidden" name="choice" value="unknown">
					<input type="hidden" name="next" value={next}>
					<Button type="submit" variant="outline" class="min-h-11 w-full" disabled={pending}>
						Don't remember
					</Button>
				</form>
			</div>
		{/key}
	{/if}
</dialog>

<style>
	dialog {
		width: min(32rem, 100%);
		max-height: min(85dvh, 40rem);
		margin: auto auto 0;
		overflow: auto;
		padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
		border: 1px solid var(--border);
		border-radius: 1rem 1rem 0 0;
		background: var(--card);
		color: var(--card-foreground);
	}

	dialog::backdrop {
		background: color-mix(in oklch, var(--midnight) 72%, transparent);
	}
</style>
