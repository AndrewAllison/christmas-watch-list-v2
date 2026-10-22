<script lang="ts">
	import PosterFrame, { posterTone } from '#lib/components/poster-frame.svelte';
	import TickButton from '#lib/components/tick-button.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let panel = $state<TickPanel | undefined>();
</script>

<svelte:head><title>History · Christmas Watch List</title></svelte:head>

<section class="space-y-6">
	<div class="space-y-1">
		<h2 class="text-2xl font-bold tracking-tight">History</h2>
		<p class="text-sm text-muted-foreground">Every viewing, with a count for each title.</p>
	</div>

	{#if data.rows.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Nothing watched yet</Card.Title>
				<Card.Description>Mark a title from Home and it will show up here.</Card.Description>
			</Card.Header>
			<Card.Footer>
				<a
					href={resolve('/')}
					class="text-gold inline-flex min-h-11 items-center text-sm font-medium"
				>
					Browse Home
				</a>
			</Card.Footer>
		</Card.Root>
	{:else}
		<ul class="space-y-3">
			{#each data.rows as item, index (item.id)}
				<li class="flex items-center gap-3">
					<PosterFrame
						posterUrl={item.posterUrl}
						title={item.title}
						tone={posterTone(index)}
						class="w-12 shrink-0"
					/>
					<div class="min-w-0 flex-1">
						<p class="truncate font-medium">{item.title}</p>
						<p class="text-xs text-muted-foreground">
							{item.count === 1 ? '1 watch' : `${item.count} watches`}
						</p>
					</div>
					<TickButton title={item.title} ontick={() => panel?.open(item)} />
				</li>
			{/each}
		</ul>
	{/if}

	<TickPanel bind:this={panel} next="/history" />
</section>
