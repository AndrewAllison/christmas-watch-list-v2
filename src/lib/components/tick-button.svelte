<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import { cn } from '#lib/utils.js';

	let {
		title,
		ontick,
		class: className = ''
	}: { title: string; ontick: () => void; class?: string } = $props();
</script>

<button
	type="button"
	class={cn(
		'text-gold hover:text-gold-glint inline-flex min-h-11 min-w-11 items-center justify-center rounded-md',
		className
	)}
	aria-label="Tick off {title}"
	onclick={ontick}
>
	<CircleCheck class="size-5" />
</button>
