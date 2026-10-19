<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Sign out · Christmas Watch List</title></svelte:head>

<section class="space-y-4">
	<h2 class="text-2xl font-bold tracking-tight">Sign out</h2>
	<Card.Root>
		<Card.Header>
			<Card.Title>Signed in as {data.email}</Card.Title>
			<Card.Description>Your list and ticks stay saved for next time.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST">
				<Button type="submit" variant="secondary" class="h-11 w-full">Sign out</Button>
			</form>
		</Card.Content>
	</Card.Root>
</section>
