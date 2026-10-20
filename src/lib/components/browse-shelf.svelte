<script lang="ts">
	import type { BrowseItem, BrowseShelf } from '#lib/browse.js';
	import FavouriteButton from '#lib/components/favourite-button.svelte';
	import TickButton from '#lib/components/tick-button.svelte';

	let { shelf, ontick }: { shelf: BrowseShelf; ontick: (item: BrowseItem) => void } = $props();
</script>

<section class="space-y-3" aria-labelledby="shelf-{shelf.relevance}">
	<div class="flex items-baseline justify-between gap-3">
		<h3 id="shelf-{shelf.relevance}" class="text-lg font-bold tracking-tight">{shelf.title}</h3>
		<p class="text-xs text-muted-foreground">{shelf.items.length}</p>
	</div>
	<ul class="flex snap-x gap-3 overflow-x-auto pb-1">
		{#each shelf.items as item (item.id)}
			<li class="w-28 shrink-0 snap-start">
				<figure class="space-y-2">
					<div
						class="bg-midnight-deep relative flex aspect-[2/3] items-end overflow-hidden rounded-md ring-1 ring-foreground/10"
					>
						{#if item.posterUrl}
							<img
								src={item.posterUrl}
								alt=""
								class="h-full w-full object-cover"
								loading="lazy"
								width="112"
								height="168"
							>
						{:else}
							<span class="text-gold p-2 text-xs font-semibold">{item.title}</span>
						{/if}
						<div class="absolute top-1 right-1">
							<FavouriteButton
								mediaId={item.id}
								title={item.title}
								onList={item.onList === true}
								next="/"
								class="bg-midnight/80"
							/>
						</div>
						<TickButton
							title={item.title}
							class="bg-midnight/80 absolute bottom-1 left-1"
							ontick={() => ontick(item)}
						/>
					</div>
					<figcaption>
						<p class="line-clamp-2 text-sm font-medium">{item.title}</p>
						{#if item.year}
							<p class="text-xs text-muted-foreground">{item.year}</p>
						{/if}
					</figcaption>
				</figure>
			</li>
		{/each}
	</ul>
</section>
