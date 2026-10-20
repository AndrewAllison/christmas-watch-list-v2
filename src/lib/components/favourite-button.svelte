<script lang="ts">
	import Heart from '@lucide/svelte/icons/heart';
	import { cn } from '#lib/utils.js';
	import { enhance } from '$app/forms';

	let {
		mediaId,
		title,
		onList,
		next,
		class: className = ''
	}: { mediaId: string; title: string; onList: boolean; next: string; class?: string } = $props();

	const label = $derived(onList ? `Remove ${title} from my list` : `Add ${title} to my list`);
</script>

<form method="POST" action="/my-list?/toggle" use:enhance>
	<input type="hidden" name="mediaId" value={mediaId}>
	<input type="hidden" name="onList" value={onList ? 'false' : 'true'}>
	<input type="hidden" name="next" value={next}>
	<button
		type="submit"
		class={cn(
			'text-gold hover:text-gold-glint inline-flex min-h-11 min-w-11 items-center justify-center rounded-md',
			className
		)}
		aria-pressed={onList}
		aria-label={label}
	>
		<Heart class={cn('size-5', onList && 'fill-berry text-berry')} />
	</button>
</form>
