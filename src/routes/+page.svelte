<script lang="ts">
	import HomePoster from '#lib/components/home-poster.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import { homeStatLabel } from '#lib/home-landing.js';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let panel = $state<TickPanel | undefined>();
</script>

<svelte:head><title>Home · Christmas Watch List</title></svelte:head>

<div class="space-y-8">
	{#if data.signedIn}
		<section
			class="grid grid-cols-3 gap-2 rounded-3xl border border-border bg-midnight-deep/70 p-4 shadow-lg backdrop-blur-xl"
		>
			<a
				href="{resolve('/season')}#season-still"
				aria-label={homeStatLabel('toWatch', data.counts.toWatch)}
				class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-center"
			>
				<span class="text-2xl font-black tracking-tight">{data.counts.toWatch}</span>
				<span class="text-xs font-medium text-muted-foreground">To watch</span>
			</a>
			<a
				href="{resolve('/season')}#season-watched"
				aria-label={homeStatLabel('thisSeason', data.counts.thisSeason)}
				class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-center"
			>
				<span class="text-2xl font-black tracking-tight">{data.counts.thisSeason}</span>
				<span class="text-xs font-medium text-muted-foreground">This season</span>
			</a>
			<a
				href={resolve('/history')}
				aria-label={homeStatLabel('allTime', data.counts.allTime)}
				class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-center"
			>
				<span class="text-2xl font-black tracking-tight">{data.counts.allTime}</span>
				<span class="text-xs font-medium text-muted-foreground">All time</span>
			</a>
		</section>

		<section class="space-y-3" aria-labelledby="home-next">
			<h3 id="home-next" class="text-lg font-bold tracking-tight">Up next</h3>
			{#if data.upNextMessage}
				<p class="text-sm text-muted-foreground">{data.upNextMessage}</p>
			{:else}
				<ul
					class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:-mx-8 md:px-8"
				>
					{#each data.upNext as item, index (item.id)}
						<li class="shrink-0">
							<HomePoster
								{item}
								{index}
								signedIn={data.signedIn}
								ontick={() => panel?.open(item)}
							/>
						</li>
					{/each}
				</ul>
			{/if}
			<a
				href={resolve('/season')}
				class="text-gold inline-flex min-h-11 items-center text-sm font-medium"
			>
				Open Season
			</a>
		</section>
	{/if}

	<section class="space-y-3" aria-labelledby="home-latest">
		<h3 id="home-latest" class="text-lg font-bold tracking-tight">Latest releases</h3>
		{#if data.latest.length === 0}
			<p class="text-sm text-muted-foreground">
				{data.signedIn ? 'Nothing new in this view.' : 'The guide is empty.'}
			</p>
		{:else}
			<ul class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:-mx-8 md:px-8">
				{#each data.latest as item, index (item.id)}
					<li class="shrink-0">
						<HomePoster {item} {index} signedIn={data.signedIn} ontick={() => panel?.open(item)} />
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

{#if data.signedIn}
	<TickPanel bind:this={panel} next="/" />
{/if}
