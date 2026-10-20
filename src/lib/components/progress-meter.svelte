<script lang="ts">
	let {
		label,
		value,
		max,
		fill
	}: { label: string; value: number; max: number; fill: 'bg-gold' | 'bg-holly' } = $props();

	const percent = $derived(max <= 0 ? 0 : Math.round((value / max) * 100));
</script>

<div class="space-y-2">
	<div class="flex items-baseline justify-between gap-3 text-sm">
		<p class="font-medium">{label}</p>
		<p class="text-muted-foreground">{value} of {max}</p>
	</div>
	<div
		class="bg-muted h-2 overflow-hidden rounded-full"
		role="progressbar"
		aria-valuenow={value}
		aria-valuemin={0}
		aria-valuemax={max}
		aria-label={label}
	>
		<div class="{fill} h-full" style:width="{percent}%"></div>
	</div>
</div>
