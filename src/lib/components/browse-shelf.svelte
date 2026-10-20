<script lang="ts">
	import type { BrowseItem, BrowseShelf } from '#lib/browse.js';
	import FavouriteButton from '#lib/components/favourite-button.svelte';
	import PosterFrame, { posterTone } from '#lib/components/poster-frame.svelte';
	import TickButton from '#lib/components/tick-button.svelte';

	let { shelf, ontick }: { shelf: BrowseShelf; ontick: (item: BrowseItem) => void } = $props();

	function kind(type: BrowseItem['type']) {
		return type === 'movie' ? 'Film' : 'Series';
	}
</script>

<section class="space-y-3" aria-labelledby="shelf-{shelf.relevance}">
	<div class="flex items-baseline justify-between gap-3">
		<h3 id="shelf-{shelf.relevance}" class="text-lg font-bold tracking-tight md:text-xl">
			{shelf.title}
		</h3>
		<p class="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
			{shelf.items.length}
		</p>
	</div>
	<div class="shelf-bleed">
		<ul class="shelf">
			{#each shelf.items as item, index (item.id)}
				<li class="w-36 shrink-0 snap-start sm:w-40 md:w-44">
					<figure class="space-y-2.5">
						<PosterFrame posterUrl={item.posterUrl} title={item.title} tone={posterTone(index)}>
							<div class="absolute top-1.5 right-1.5">
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
								class="bg-midnight/80 absolute bottom-1.5 left-1.5"
								ontick={() => ontick(item)}
							/>
						</PosterFrame>
						<figcaption class="space-y-1 pr-1">
							<p class="line-clamp-2 text-sm leading-snug font-semibold">{item.title}</p>
							<p class="text-xs text-muted-foreground">
								{#if item.year}
									{item.year}
									·
								{/if}
								{kind(item.type)}
							</p>
							{#if item.genres && item.genres.length > 0}
								<ul class="flex flex-wrap gap-1">
									{#each item.genres.slice(0, 2) as genre (genre)}
										<li
											class="rounded-full border border-border bg-muted/80 px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground"
										>
											{genre}
										</li>
									{/each}
								</ul>
							{/if}
						</figcaption>
					</figure>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.shelf-bleed {
		margin-inline: -1rem;
	}

	.shelf {
		display: flex;
		gap: 1rem;
		overflow-x: auto;
		padding: 0.25rem 1rem 0.75rem;
		scroll-snap-type: x mandatory;
		scroll-padding-inline: 1rem;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
		mask-image: linear-gradient(to right, black calc(100% - 1.75rem), transparent);
	}

	.shelf::-webkit-scrollbar {
		display: none;
	}

	@media (min-width: 48rem) {
		.shelf-bleed {
			margin-inline: -2rem;
		}

		.shelf {
			gap: 1.25rem;
			padding-inline: 2rem;
			scroll-padding-inline: 2rem;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.shelf {
			scroll-behavior: smooth;
		}
	}
</style>
