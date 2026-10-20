<script lang="ts">
	import type { BrowseItem } from '#lib/browse.js';
	import BrowseShelf from '#lib/components/browse-shelf.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let panel = $state<TickPanel | undefined>();

	function openTick(item: BrowseItem) {
		panel?.open(item);
	}
</script>

<section class="space-y-8">
	<h2 class="text-2xl font-bold tracking-tight">Browse the guide</h2>

	{#if data.shelves.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>The guide is empty</Card.Title>
				<Card.Description>
					Christmas and adjacent titles show up here once the catalogue is imported.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		{#each data.shelves as shelf (shelf.relevance)}
			<BrowseShelf {shelf} ontick={openTick} />
		{/each}
	{/if}

	<TickPanel bind:this={panel} next="/" />
</section>
