<script lang="ts">
	import './layout.css';
	import { type Component, onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import TabBar from '#lib/components/tab-bar.svelte';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	let FestiveScene = $state<Component | null>(null);

	onMount(() => {
		let live = true;
		void import('#lib/effects/festive-scene.svelte').then((mod) => {
			if (live) FestiveScene = mod.default;
		});
		return () => {
			live = false;
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon}>
	<title>Christmas Watch List</title>
</svelte:head>

<div class="night-sky" aria-hidden="true"></div>
{#if FestiveScene}
	<FestiveScene />
{/if}

<div class="relative flex min-h-dvh flex-col pt-[calc(env(safe-area-inset-top)+2rem)]">
	<header class="mx-auto w-full max-w-5xl px-4 pt-2 pb-3 md:px-8 md:pt-4">
		<div class="flex items-center justify-between gap-4">
			<p class="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
				The Christmas double issue
			</p>
			{#if data.user}
				<details class="relative">
					<summary
						class="max-w-40 cursor-pointer list-none truncate text-xs text-muted-foreground hover:text-paper"
						title="Signed in as {data.user.email}"
					>
						{data.user.name || data.user.email}
					</summary>
					<div
						class="absolute right-0 z-50 mt-2 flex min-w-36 flex-col rounded-md border border-border bg-midnight-deep p-1"
					>
						<a
							href={resolve('/history')}
							class="min-h-11 rounded-md px-3 py-2 text-sm hover:text-gold"
						>
							History
						</a>
						<a
							href={resolve('/sign-out')}
							class="min-h-11 rounded-md px-3 py-2 text-sm hover:text-gold"
						>
							Sign out
						</a>
					</div>
				</details>
			{:else}
				<a href={resolve('/sign-in')} class="text-xs font-medium text-gold hover:text-gold-glint">
					Sign in
				</a>
			{/if}
		</div>
		<h1 class="text-3xl font-black tracking-tight">Christmas Watch List</h1>
		<div class="mt-3 h-0.5 bg-linear-to-r from-berry via-gold to-holly" aria-hidden="true"></div>
	</header>

	<main
		class="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(var(--tab-bar-height)+max(0.75rem,env(safe-area-inset-bottom))+1.25rem)] md:px-8"
	>
		{@render children()}
	</main>

	<TabBar signedIn={Boolean(data.user)} />
</div>
