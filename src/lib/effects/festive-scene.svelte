<script lang="ts">
	const bulbColours = [
		'var(--berry)',
		'var(--gold)',
		'var(--mint)',
		'var(--holly)',
		'var(--gold-glint)',
		'var(--berry-soft)'
	] as const;

	const bulbs = Array.from({ length: 18 }, (_, index) => bulbColours[index % bulbColours.length]);

	const flakes = [
		{ x: '4%', delay: '0s', duration: '16s', size: '3px', drift: '18px' },
		{ x: '11%', delay: '2s', duration: '19s', size: '2px', drift: '-14px' },
		{ x: '18%', delay: '5s', duration: '14s', size: '4px', drift: '10px' },
		{ x: '27%', delay: '1s', duration: '21s', size: '2px', drift: '-22px' },
		{ x: '34%', delay: '7s', duration: '17s', size: '3px', drift: '16px' },
		{ x: '41%', delay: '3s', duration: '15s', size: '2px', drift: '-8px' },
		{ x: '49%', delay: '6s', duration: '22s', size: '4px', drift: '12px' },
		{ x: '56%', delay: '0.5s', duration: '18s', size: '2px', drift: '-18px' },
		{ x: '63%', delay: '4s', duration: '13s', size: '3px', drift: '20px' },
		{ x: '71%', delay: '8s', duration: '20s', size: '2px', drift: '-12px' },
		{ x: '78%', delay: '1.5s', duration: '16s', size: '4px', drift: '8px' },
		{ x: '86%', delay: '5.5s', duration: '19s', size: '2px', drift: '-16px' },
		{ x: '93%', delay: '3.5s', duration: '15s', size: '3px', drift: '14px' },
		{ x: '8%', delay: '9s', duration: '23s', size: '2px', drift: '-10px' },
		{ x: '52%', delay: '10s', duration: '18s', size: '3px', drift: '22px' },
		{ x: '88%', delay: '7.5s', duration: '14s', size: '2px', drift: '-20px' }
	];

	const spans = bulbs.length;
	const path = `M0 8${Array.from({ length: spans }, (_, index) => {
		const end = (index + 1) * 40;
		return ` Q ${end - 20} 20 ${end} 8`;
	}).join('')}`;

	const still =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<div class="scene" class:still>
	{#if !still}
		<div class="snow" aria-hidden="true">
			{#each flakes as flake (flake.x + flake.delay)}
				<span
					class="flake"
					style:--x={flake.x}
					style:--delay={flake.delay}
					style:--duration={flake.duration}
					style:--size={flake.size}
					style:--drift={flake.drift}
				></span>
			{/each}
		</div>
	{/if}

	<div class="lights" aria-hidden="true">
		<svg class="wire" viewBox="0 0 {spans * 40} 24" preserveAspectRatio="none">
			<path d={path} />
		</svg>
		{#each bulbs as colour, index (index)}
			<span class="drop">
				<span class="cord"></span>
				<span class="bulb" style:--bulb={colour} style:animation-delay="{index * 0.18}s"></span>
			</span>
		{/each}
	</div>
</div>

<style>
	.scene {
		pointer-events: none;
	}

	.snow {
		position: fixed;
		z-index: 25;
		overflow: hidden;
		inset: 0;
	}

	.flake {
		position: absolute;
		top: -8%;
		left: var(--x);
		width: var(--size);
		height: var(--size);
		border-radius: 999px;
		background: color-mix(in oklch, var(--paper) 85%, var(--gold-glint));
		opacity: 0;
		animation: fall var(--duration) linear var(--delay) infinite;
	}

	.lights {
		position: fixed;
		z-index: 30;
		top: 0;
		right: 0;
		left: 0;
		display: flex;
		height: calc(env(safe-area-inset-top) + 1.7rem);
		align-items: flex-start;
		justify-content: space-evenly;
		padding-top: env(safe-area-inset-top);
	}

	.wire {
		position: absolute;
		top: calc(env(safe-area-inset-top) + 0.05rem);
		right: 0;
		left: 0;
		width: 100%;
		height: 1.15rem;
		color: color-mix(in oklch, var(--holly) 80%, var(--gold));
	}

	.wire path {
		fill: none;
		stroke: currentcolor;
		stroke-width: 1.5;
	}

	.drop {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cord {
		width: 1px;
		height: 0.35rem;
		background: color-mix(in oklch, var(--holly) 70%, var(--midnight));
	}

	.drop:nth-child(even) .cord {
		height: 0.6rem;
	}

	.bulb {
		width: 0.48rem;
		height: 0.62rem;
		border-radius: 0.45rem;
		background: var(--bulb);
		box-shadow: 0 0 8px color-mix(in oklch, var(--bulb) 75%, transparent);
		animation: twinkle 2.6s ease-in-out infinite;
	}

	.still .bulb {
		animation: none;
		opacity: 0.9;
	}

	@keyframes fall {
		0% {
			opacity: 0;
			transform: translate3d(0, -10vh, 0);
		}
		12% {
			opacity: 0.75;
		}
		100% {
			opacity: 0.15;
			transform: translate3d(var(--drift), 110vh, 0);
		}
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flake {
			display: none;
		}

		.bulb {
			animation: none;
			opacity: 0.9;
		}
	}
</style>
