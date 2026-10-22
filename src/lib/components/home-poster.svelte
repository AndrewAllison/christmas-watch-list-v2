<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import PosterFrame, { posterTone } from '#lib/components/poster-frame.svelte';
	import { cn } from '#lib/utils.js';
	import { enhance } from '$app/forms';

	let {
		item,
		index,
		signedIn,
		layout = 'shelf',
		ontick
	}: {
		item: {
			id: string;
			title: string;
			year: number | null;
			posterUrl: string | null;
			onSeason: boolean;
		};
		index: number;
		signedIn: boolean;
		layout?: 'shelf' | 'grid';
		ontick: () => void;
	} = $props();

	const iconClass =
		'inline-flex size-11 items-center justify-center rounded-full border border-border bg-midnight-deep/70 text-gold backdrop-blur-md';
</script>

<figure class={cn(layout === 'shelf' ? 'w-28 shrink-0 snap-start sm:w-32' : 'w-full min-w-0')}>
	<PosterFrame
		posterUrl={item.posterUrl}
		title={item.title}
		tone={posterTone(index)}
		class="w-full"
	>
		{#if signedIn}
			<div class="absolute inset-x-1 bottom-1 flex items-center justify-between">
				<form method="POST" action={item.onSeason ? '?/remove' : '?/add'} use:enhance>
					<input type="hidden" name="mediaId" value={item.id}>
					<button
						type="submit"
						class={iconClass}
						aria-label={item.onSeason
							? `Remove ${item.title} from this season`
							: `Add ${item.title} to this season`}
					>
						{#if item.onSeason}
							<X class="size-4" aria-hidden="true" />
						{:else}
							<Plus class="size-4" aria-hidden="true" />
						{/if}
					</button>
				</form>
				<button
					type="button"
					class={iconClass}
					aria-label={`Mark ${item.title} as watched`}
					onclick={ontick}
				>
					<CircleCheck class="size-4" aria-hidden="true" />
				</button>
			</div>
		{/if}
	</PosterFrame>
	<figcaption class="mt-2 space-y-0.5">
		<p class="line-clamp-2 text-sm font-medium">{item.title}</p>
		{#if item.year}
			<p class="text-xs text-muted-foreground">{item.year}</p>
		{/if}
	</figcaption>
</figure>
