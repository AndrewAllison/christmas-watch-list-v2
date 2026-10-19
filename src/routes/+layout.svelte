<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import TabBar from '#lib/components/tab-bar.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon}>
	<title>Christmas Watch List</title>
</svelte:head>

<div class="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
	<header class="mx-auto w-full max-w-lg px-4 pt-6 pb-4">
		<p class="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
			The Christmas double issue
		</p>
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
