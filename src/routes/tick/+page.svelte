<script lang="ts">
	import PosterFrame, { posterTone } from '#lib/components/poster-frame.svelte';
	import TickButton from '#lib/components/tick-button.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { filterTickTitles } from '#lib/tick.js';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let query = $state('');
	let panel = $state<TickPanel | undefined>();

	const matches = $derived(filterTickTitles(data.titles, query));
	const inputClass =
		'h-11 w-full rounded-md border border-input bg-midnight-deep px-3 text-base text-paper placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
</script>

<svelte:head><title>Tick · Christmas Watch List</title></svelte:head>

<section class="space-y-6">
	<div class="space-y-1">
		<h2 class="text-2xl font-bold tracking-tight">Tradition Tick</h2>
		<p class="text-sm text-muted-foreground">Find a title, then ink when you watched it.</p>
	</div>

	{#if form?.message}
		<p role="alert" class="text-sm text-destructive">{form.message}</p>
	{/if}

	{#if !data.signedIn}
		<p class="text-sm text-muted-foreground">
			<a
				href="{resolve('/sign-in')}?next={encodeURIComponent('/tick')}"
				class="font-medium text-gold hover:text-gold-glint"
			>
				Sign in
			</a>
			to save a tick.
		</p>
	{/if}

	{#if data.titles.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>The guide is empty</Card.Title>
				<Card.Description>Titles show up here once the catalogue is imported.</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		<div class="space-y-2">
			<label for="tick-query" class="text-sm font-medium">Find a title</label>
			<input
				id="tick-query"
				class={inputClass}
				type="search"
				autocomplete="off"
				placeholder="Search the guide"
				bind:value={query}
			>
		</div>

		{#if query.trim() === ''}
			<p class="text-sm text-muted-foreground">Type a title from the guide, then tick it off.</p>
		{:else if matches.length === 0}
			<p class="text-sm text-muted-foreground">Nothing in the guide matches that.</p>
		{:else}
			<ul class="space-y-3">
				{#each matches as item, index (item.id)}
					<li class="flex items-center gap-3">
						<PosterFrame
							posterUrl={item.posterUrl}
							title={item.title}
							tone={posterTone(index)}
							class="w-16 shrink-0"
						/>
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium">{item.title}</p>
							{#if item.year}
								<p class="text-xs text-muted-foreground">{item.year}</p>
							{/if}
						</div>
						<TickButton title={item.title} ontick={() => panel?.open(item)} />
					</li>
				{/each}
			</ul>
		{/if}
	{/if}

	<TickPanel bind:this={panel} next="/tick" />
</section>
