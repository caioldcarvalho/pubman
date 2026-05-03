<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';

	let startDate = $state('');
	let endDate = $state('');

	async function create() {
		if (!startDate || !endDate) return;
		const id = await schedule.addPeriod(startDate, endDate);
		goto(`/escala/${id}`);
	}
</script>

<PageHeader title="Nova Escala" backHref="/escala" />

<div class="px-4 py-4">
	<p class="mb-4 text-sm text-text-muted">Selecione o período. Sextas e sábados serão incluídos automaticamente.</p>

	<label class="mb-1 block text-sm text-text-muted">Data inicial</label>
	<input bind:value={startDate} type="date" class="mb-4 w-full rounded-lg bg-surface px-3 py-2 text-text outline-none focus:ring-2 focus:ring-accent" />

	<label class="mb-1 block text-sm text-text-muted">Data final</label>
	<input bind:value={endDate} type="date" class="mb-6 w-full rounded-lg bg-surface px-3 py-2 text-text outline-none focus:ring-2 focus:ring-accent" />

	<button
		onclick={create}
		disabled={!startDate || !endDate}
		class="w-full rounded-lg bg-accent py-3 font-medium text-white transition-colors disabled:opacity-50 active:bg-accent/80"
	>
		Criar Escala
	</button>
</div>
