<script lang="ts">
	import PosterFrame, { posterTone } from '#lib/components/poster-frame.svelte';
	import ProgressMeter from '#lib/components/progress-meter.svelte';
	import TickButton from '#lib/components/tick-button.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { emptySeasonPrompt } from '#lib/season-list.js';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let panel = $state<TickPanel | undefined>();
	const current = $derived(data.year === data.active);
	const total = $derived(
		data.stillToWatch.length + data.watched.filter((item) => item.onSeason).length
	);
	const managed = $derived(data.watched.filter((item) => item.onSeason).length);
	const next = $derived(data.years.length > 1 ? `/season?year=${data.year}` : '/season');
	const prompt = emptySeasonPrompt();
</script>

<svelte:head><title>Season · Christmas Watch List</title></svelte:head>

<section class="space-y-8">
	<div class="space-y-2">
		<h2 class="text-2xl font-bold tracking-tight">Season</h2>
		{#if data.years.length > 1}
			<nav aria-label="Seasons" class="flex flex-wrap gap-2">
				{#each data.years as year (year)}
					<a
						href="?year={year}"
						aria-current={year === data.year ? 'page' : undefined}
						class="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium {year ===
						data.year
							? 'bg-gold text-midnight'
							: 'text-muted-foreground'}"
					>
						{year}
					</a>
				{/each}
			</nav>
		{:else}
			<p class="text-sm text-muted-foreground">1 Nov – 31 Dec {data.year}</p>
		{/if}
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>The season</Card.Title>
			<Card.Description>{data.phaseLabel}</Card.Description>
		</Card.Header>
		<Card.Content>
			<ProgressMeter
				label="Days in"
				value={data.calendar.day}
				max={data.calendar.length}
				fill="bg-gold"
			/>
		</Card.Content>
	</Card.Root>

	{#if total === 0 && data.watched.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Nothing chosen for this season yet</Card.Title>
				<Card.Description>{prompt.description}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<a
					href={resolve('/discovery')}
					class="text-gold inline-flex min-h-11 items-center text-sm font-medium"
				>
					{prompt.link}
				</a>
			</Card.Footer>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>This year's list</Card.Title>
				<Card.Description>{managed} of {total} watched.</Card.Description>
			</Card.Header>
			<Card.Content class="gap-6">
				<ProgressMeter label="Watched" value={managed} max={total} fill="bg-holly" />

				<section class="space-y-3" aria-labelledby="season-still">
					<h3 id="season-still" class="text-sm font-bold tracking-tight">Still to watch</h3>
					{#if data.stillToWatch.length === 0}
						<p class="text-sm text-muted-foreground">Nothing left to watch this season.</p>
					{:else}
						<ul class="space-y-3">
							{#each data.stillToWatch as item, index (item.id)}
								<li class="flex items-center gap-3">
									<PosterFrame
										posterUrl={item.posterUrl}
										title={item.title}
										tone={posterTone(index)}
										class="w-12 shrink-0"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium">{item.title}</p>
										{#if item.year}
											<p class="text-xs text-muted-foreground">{item.year}</p>
										{/if}
									</div>
									{#if current}
										<form method="POST" action="?/remove" use:enhance>
											<input type="hidden" name="mediaId" value={item.id}>
											<button type="submit" class="min-h-11 px-2 text-sm">Remove</button>
										</form>
										<TickButton title={item.title} ontick={() => panel?.open(item)} />
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<section class="space-y-3" aria-labelledby="season-watched">
					<h3 id="season-watched" class="text-sm font-bold tracking-tight">Watched</h3>
					{#if data.watched.length === 0}
						<p class="text-sm text-muted-foreground">Nothing watched in this season yet.</p>
					{:else}
						<ul class="space-y-3">
							{#each data.watched as item, index (item.id)}
								<li class="flex items-center gap-3">
									<PosterFrame
										posterUrl={item.posterUrl}
										title={item.title}
										tone={posterTone(index)}
										class="w-12 shrink-0"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium">{item.title}</p>
										{#if item.year}
											<p class="text-xs text-muted-foreground">{item.year}</p>
										{/if}
									</div>
									{#if current}
										<form method="POST" action={item.onSeason ? '?/remove' : '?/add'} use:enhance>
											<input type="hidden" name="mediaId" value={item.id}>
											<button type="submit" class="text-gold min-h-11 px-2 text-sm font-medium">
												{item.onSeason ? 'Remove' : 'Add to this season'}
											</button>
										</form>
										<TickButton title={item.title} ontick={() => panel?.open(item)} />
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if current}
		<TickPanel bind:this={panel} {next} />
	{/if}
</section>
