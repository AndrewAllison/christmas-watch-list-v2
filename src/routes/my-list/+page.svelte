<script lang="ts">
	import FavouriteButton from '#lib/components/favourite-button.svelte';
	import PosterFrame, { posterTone } from '#lib/components/poster-frame.svelte';
	import TickButton from '#lib/components/tick-button.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { ListTitle } from '#lib/my-list.js';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let panel = $state<TickPanel | undefined>();

	const sections = $derived(
		data.list
			? [
					{
						id: 'still',
						title: 'Still to watch',
						empty: 'Nothing left to watch this season.',
						items: data.list.stillToWatch
					},
					{
						id: 'watched',
						title: 'Watched',
						empty: null,
						items: data.list.watched
					}
				]
			: []
	);
</script>

<svelte:head><title>My List · Christmas Watch List</title></svelte:head>

{#snippet row(
	item: ListTitle,
	index: number
)}
	<div class="flex items-center gap-3">
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
		<FavouriteButton mediaId={item.id} title={item.title} onList={true} next="/my-list" />
	</div>
{/snippet}

<section class="space-y-8">
	<div class="space-y-1">
		<h2 class="text-2xl font-bold tracking-tight">My Christmas List</h2>
		{#if data.list}
			<p class="text-sm text-muted-foreground">Nov–Dec {data.list.seasonYear}</p>
		{/if}
	</div>

	{#if !data.signedIn}
		<Card.Root>
			<Card.Header>
				<Card.Title>Sign in to keep your list</Card.Title>
				<Card.Description>
					Favourites you rewatch each year live here, with what's still to watch this season.
				</Card.Description>
			</Card.Header>
			<Card.Footer>
				<a
					href="{resolve('/sign-in')}?next={encodeURIComponent('/my-list')}"
					class="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium"
				>
					Sign in
				</a>
			</Card.Footer>
		</Card.Root>
	{:else if data.list.stillToWatch.length === 0 && data.list.watched.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Nothing on your list yet</Card.Title>
				<Card.Description
					>Add a title from the guide and it will wait here each season.</Card.Description
				>
			</Card.Header>
			<Card.Footer>
				<a
					href={resolve('/')}
					class="text-gold inline-flex min-h-11 items-center text-sm font-medium"
				>
					Browse the guide
				</a>
			</Card.Footer>
		</Card.Root>
	{:else}
		{#each sections as section (section.id)}
			{#if section.items.length > 0}
				<section class="space-y-3" aria-labelledby="list-{section.id}">
					<h3 id="list-{section.id}" class="text-lg font-bold tracking-tight">{section.title}</h3>
					<ul class="space-y-3">
						{#each section.items as item, index (item.id)}
							<li>
								{@render row(item, index)}
							</li>
						{/each}
					</ul>
				</section>
			{:else if section.empty}
				<p class="text-sm text-muted-foreground">{section.empty}</p>
			{/if}
		{/each}
	{/if}

	<TickPanel bind:this={panel} next="/my-list" />
</section>
