<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Snowflake from '@lucide/svelte/icons/snowflake';
	import Star from '@lucide/svelte/icons/star';
	import Tv from '@lucide/svelte/icons/tv';
	import type { Component } from 'svelte';
	import { isTabActive, type TabId, tabs } from '#lib/navigation.js';
	import { cn } from '#lib/utils.js';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const icons: Record<TabId, Component> = {
		browse: Tv,
		'my-list': Star,
		tick: CircleCheck,
		season: Snowflake
	};
</script>

<nav
	aria-label="Primary"
	class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-midnight-deep/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:bottom-4 md:border-0 md:bg-transparent md:px-4 md:pb-0 md:backdrop-blur-none"
>
	<ul
		class="mx-auto grid h-(--tab-bar-height) max-w-lg grid-cols-4 md:max-w-md md:rounded-full md:border md:border-border md:bg-midnight-deep/90 md:shadow-lg md:backdrop-blur-md"
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
