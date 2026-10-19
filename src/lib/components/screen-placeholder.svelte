<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';

	let { title, description, day }: { title: string; description: string; day: number } = $props();
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-bold tracking-tight">{title}</h2>
	<Card.Root>
		<Card.Header>
			<Card.Title>Coming on day {day}</Card.Title>
			<Card.Description>{description}</Card.Description>
		</Card.Header>
	</Card.Root>
</section>
