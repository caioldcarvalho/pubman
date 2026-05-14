<script lang="ts">
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { payments } from '$lib/stores/payments.svelte';
	import { events } from '$lib/stores/events.svelte';
	import { tasks } from '$lib/stores/tasks.svelte';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const allLoaded = $derived(
		collaborators.loaded && products.loaded && consumption.loaded && purchases.loaded && schedule.loaded && payments.loaded && events.loaded && tasks.loaded
	);

	// Load once on mount, not on every reactive update
	onMount(() => {
		if (!collaborators.loaded) collaborators.load();
		if (!products.loaded) products.load();
		if (!consumption.loaded) consumption.load();
		if (!purchases.loaded) purchases.load();
		if (!schedule.loaded) schedule.load();
		if (!payments.loaded) payments.load();
		if (!events.loaded) events.load();
		if (!tasks.loaded) tasks.load();
	});
</script>

{#if allLoaded}
	{@render children()}
{:else}
	<div class="flex min-h-[60dvh] items-center justify-center">
		<div class="text-center">
			<div class="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-surface-2 border-t-accent"></div>
			<p class="text-xs text-text-muted">Carregando dados...</p>
		</div>
	</div>
{/if}
