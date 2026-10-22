<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import HomePoster from '#lib/components/home-poster.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import { discoveryNext, discoveryStatus } from '#lib/discovery.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let panel = $state<TickPanel | undefined>();
	let typed = $state<string | null>(null);

	const query = $derived(typed ?? data.query);
	const status = $derived(discoveryStatus(data.titles.length, data.query, data.signedIn));
	const panelNext = $derived(discoveryNext(query, data.seen));

	function onsearch(value: string) {
		typed = value;
		const target = discoveryNext(value, data.seen);
		const search = target.includes('?') ? target.slice(target.indexOf('?')) : '';
		void goto(`${resolve('/discovery')}${search}`, {
			replace: true,
			reset: false
		});
	}
</script>

<svelte:head><title>Discovery · Christmas Watch List</title></svelte:head>

<div class="space-y-8">
	<div class="space-y-3">
		<h2 class="text-2xl font-bold tracking-tight">Discovery</h2>
		<form method="GET" action={resolve('/discovery')}>
			{#if data.seen}
				<input type="hidden" name="seen" value="1">
			{/if}
			<label class="sr-only" for="discovery-search">Search titles</label>
			<div class="relative">
				<Search
					class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
				/>
				<input
					id="discovery-search"
					name="q"
					type="search"
					placeholder="Search titles"
					value={query}
					oninput={(event) => onsearch(event.currentTarget.value)}
					class="border-border bg-midnight-deep/70 h-11 w-full rounded-full border pr-4 pl-11 text-base backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
			</div>
		</form>
		{#if data.signedIn}
			<form method="GET" action={resolve('/discovery')}>
				{#if query.trim()}
					<input type="hidden" name="q" value={query.trim()}>
				{/if}
				{#if !data.seen}
					<input type="hidden" name="seen" value="1">
				{/if}
				<button
					type="submit"
					aria-pressed={data.seen}
					class="border-border inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium"
				>
					{data.seen ? 'Showing seen' : 'Show seen'}
				</button>
			</form>
		{/if}
	</div>

	{#if status.kind === 'results'}
		<h3 class="text-lg font-bold tracking-tight">{status.label}</h3>
	{/if}
	{#if status.kind === 'empty'}
		<p class="text-sm text-muted-foreground">{status.label}</p>
	{:else}
		<ul class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
			{#each data.titles as item, index (item.id)}
				<li>
					<HomePoster
						{item}
						{index}
						layout="grid"
						signedIn={data.signedIn}
						ontick={() => panel?.open(item)}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if data.signedIn}
	<TickPanel bind:this={panel} next={panelNext} />
{/if}
