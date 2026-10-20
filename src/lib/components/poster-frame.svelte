<script lang="ts" module>
	export const posterTones = ['berry', 'gold', 'mint', 'holly'] as const;
	export type PosterTone = (typeof posterTones)[number];

	export function posterTone(index: number): PosterTone {
		return posterTones[index % posterTones.length] ?? 'gold';
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	let {
		posterUrl,
		title,
		tone = 'gold',
		class: className,
		children
	}: {
		posterUrl: string | null;
		title: string;
		tone?: PosterTone;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<div class={cn('frame', `tone-${tone}`, className)}>
	<div class="inner">
		{#if posterUrl}
			<img src={posterUrl} alt="" class="cover" loading="lazy">
		{:else}
			<span class="fallback">{title}</span>
		{/if}
		{@render children?.()}
	</div>
</div>

<style>
	.frame {
		border-radius: calc(var(--radius) * 1.15);
		padding: 1.5px;
		background: linear-gradient(
			155deg,
			var(--tone-a),
			color-mix(in oklch, var(--tone-b) 65%, var(--midnight)) 72%
		);
		box-shadow: 0 10px 24px color-mix(in oklch, var(--tone-a) 24%, transparent);
	}

	.tone-berry {
		--tone-a: var(--berry);
		--tone-b: var(--gold);
	}

	.tone-gold {
		--tone-a: var(--gold);
		--tone-b: var(--berry);
	}

	.tone-mint {
		--tone-a: var(--mint);
		--tone-b: var(--holly);
	}

	.tone-holly {
		--tone-a: var(--holly);
		--tone-b: var(--gold);
	}

	.inner {
		position: relative;
		display: flex;
		aspect-ratio: 2 / 3;
		align-items: flex-end;
		overflow: hidden;
		border-radius: calc(var(--radius) * 1.02);
		background:
			linear-gradient(180deg, color-mix(in oklch, var(--tone-a) 34%, transparent), transparent 58%),
			var(--midnight-deep);
	}

	.inner:has(.fallback) {
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.cover {
		height: 100%;
		width: 100%;
		object-fit: cover;
	}

	.fallback {
		padding: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--gold);
	}

	@media (hover: hover) and (prefers-reduced-motion: no-preference) {
		.frame {
			transition:
				transform 180ms ease,
				box-shadow 180ms ease;
		}

		.frame:hover {
			transform: translateY(-3px);
			box-shadow: 0 16px 28px color-mix(in oklch, var(--tone-a) 34%, transparent);
		}
	}
</style>
