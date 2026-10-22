<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Snowflake from '@lucide/svelte/icons/snowflake';
	import Tv from '@lucide/svelte/icons/tv';
	import type { Component } from 'svelte';
	import { isTabActive, type TabId, tabsFor } from '#lib/navigation.js';
	import { cn } from '#lib/utils.js';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { signedIn }: { signedIn: boolean } = $props();

	const icons: Record<TabId, Component> = {
		home: Tv,
		discovery: Search,
		season: Snowflake
	};

	const tabs = $derived(tabsFor(signedIn));
</script>

<nav
	aria-label="Primary"
	class="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 px-4"
>
	<ul
		class={cn(
			'mx-auto grid h-(--tab-bar-height) max-w-md rounded-full border border-border bg-midnight-deep/70 shadow-lg backdrop-blur-xl',
			tabs.length === 3 && 'grid-cols-3',
			tabs.length === 2 && 'grid-cols-2',
			tabs.length === 1 && 'grid-cols-1'
		)}
	>
		{#each tabs as tab (tab.id)}
			{@const Icon = icons[tab.id]}
			{@const active = isTabActive(tab, page.url.pathname)}
			<li>
				<a
					href={resolve(tab.href)}
					aria-current={active ? 'page' : undefined}
					class={cn(
						'flex h-full min-h-11 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
						active ? 'text-gold' : 'text-muted-foreground hover:text-paper'
					)}
				>
					<Icon class="size-5" aria-hidden="true" />
					{tab.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
