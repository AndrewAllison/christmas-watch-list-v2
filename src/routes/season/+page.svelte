<script lang="ts">
	import ProgressMeter from '#lib/components/progress-meter.svelte';
	import TickButton from '#lib/components/tick-button.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { SeasonTitle } from '#lib/season-progress.js';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let panel = $state<TickPanel | undefined>();

	const calendar = $derived(data.season.calendar);
	const list = $derived(data.season.list);
</script>

<svelte:head><title>Season · Christmas Watch List</title></svelte:head>

{#snippet titleRow(
	item: SeasonTitle,
	tick: boolean
)}
	<div class="flex items-center gap-3">
		<div
			class="bg-midnight-deep flex aspect-[2/3] w-14 shrink-0 items-end overflow-hidden rounded-md ring-1 ring-foreground/10"
		>
			{#if item.posterUrl}
				<img src={item.posterUrl} alt="" class="h-full w-full object-cover" width="56" height="84">
			{:else}
				<span class="text-gold p-1 text-[10px] font-semibold">{item.title}</span>
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<p class="truncate font-medium">{item.title}</p>
			{#if item.year}
				<p class="text-xs text-muted-foreground">{item.year}</p>
			{/if}
		</div>
		{#if tick}
			<TickButton title={item.title} ontick={() => panel?.open(item)} />
		{/if}
	</div>
{/snippet}

<section class="space-y-8">
	<div class="space-y-1">
		<h2 class="text-2xl font-bold tracking-tight">Season progress</h2>
		<p class="text-sm text-muted-foreground">1 Nov – 31 Dec {calendar.year}</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>The season</Card.Title>
			<Card.Description>{data.season.phaseLabel}</Card.Description>
		</Card.Header>
		<Card.Content>
			<ProgressMeter label="Days in" value={calendar.day} max={calendar.length} fill="bg-gold" />
		</Card.Content>
	</Card.Root>

	{#if !data.signedIn}
		<Card.Root>
			<Card.Header>
				<Card.Title>Sign in to see your progress</Card.Title>
				<Card.Description>
					Ticks on your list stack up here from 1 November to 31 December.
				</Card.Description>
			</Card.Header>
			<Card.Footer>
				<a
					href="{resolve('/sign-in')}?next={encodeURIComponent('/season')}"
					class="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium"
				>
					Sign in
				</a>
			</Card.Footer>
		</Card.Root>
	{:else if list && list.total === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Nothing on your list yet</Card.Title>
				<Card.Description>{list.label}</Card.Description>
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
	{:else if list}
		<Card.Root>
			<Card.Header>
				<Card.Title>Your list</Card.Title>
				<Card.Description>{list.label}</Card.Description>
			</Card.Header>
			<Card.Content class="gap-6">
				<ProgressMeter label="Watched" value={list.watched} max={list.total} fill="bg-holly" />

				{#if list.stillToWatch.length > 0}
					<section class="space-y-3" aria-labelledby="season-still">
						<h3 id="season-still" class="text-sm font-bold tracking-tight">Still to watch</h3>
						<ul class="space-y-3">
							{#each list.stillToWatch as item (item.id)}
								<li>
									{@render titleRow(item, true)}
								</li>
							{/each}
						</ul>
					</section>
				{:else}
					<p class="text-sm text-muted-foreground">Nothing left to watch this season.</p>
				{/if}

				{#if list.watchedTitles.length > 0}
					<section class="space-y-3" aria-labelledby="season-watched">
						<h3 id="season-watched" class="text-sm font-bold tracking-tight">Watched</h3>
						<ul class="space-y-3">
							{#each list.watchedTitles as item (item.id)}
								<li>
									{@render titleRow(item, false)}
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</Card.Content>
			<Card.Footer>
				<a
					href={resolve('/my-list')}
					class="text-gold inline-flex min-h-11 items-center text-sm font-medium"
				>
					Open My List
				</a>
			</Card.Footer>
		</Card.Root>
		<TickPanel bind:this={panel} next="/season" />
	{/if}
</section>
