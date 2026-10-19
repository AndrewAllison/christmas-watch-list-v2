<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import TabBar from '#lib/components/tab-bar.svelte';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon}>
	<title>Christmas Watch List</title>
</svelte:head>

<div class="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
	<header class="mx-auto w-full max-w-lg px-4 pt-6 pb-4">
		<div class="flex items-center justify-between gap-4">
			<p class="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
				The Christmas double issue
			</p>
			{#if data.user}
				<a
					href={resolve('/sign-out')}
					class="max-w-40 truncate text-xs text-muted-foreground hover:text-paper"
					title="Signed in as {data.user.email}"
				>
					{data.user.name || data.user.email}
				</a>
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
		class="mx-auto w-full max-w-lg flex-1 px-4 pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+1.5rem)]"
	>
		{@render children()}
	</main>

	<TabBar />
</div>
