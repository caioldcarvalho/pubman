<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { formatDate, getDayName } from '$lib/utils';

	let startDate = $state('');
	let endDate = $state('');
	let showExtra = $state(false);
	let extraDate = $state('');
	let extraDates = $state<string[]>([]);

	function addExtraDate() {
		if (!extraDate || extraDates.includes(extraDate)) return;
		extraDates = [...extraDates, extraDate].sort();
		extraDate = '';
	}

	function removeExtraDate(d: string) {
		extraDates = extraDates.filter((e) => e !== d);
	}

	async function create() {
		if (!startDate || !endDate) return;
		const id = await schedule.addPeriod(startDate, endDate, extraDates);
		goto(`/escala/${id}`);
	}
</script>

<PageHeader title="Nova Escala" backHref="/escala" />

<div class="px-4 py-4">
	<p class="mb-4 text-sm text-text-muted">Selecione o período. Sextas e sábados serão incluídos automaticamente.</p>

	<label class="mb-1 block text-sm text-text-muted">Data inicial</label>
	<input bind:value={startDate} type="date" class="mb-4 w-full rounded-lg bg-surface px-3 py-2 text-text outline-none focus:ring-2 focus:ring-accent" />

	<label class="mb-1 block text-sm text-text-muted">Data final</label>
	<input bind:value={endDate} type="date" class="mb-4 w-full rounded-lg bg-surface px-3 py-2 text-text outline-none focus:ring-2 focus:ring-accent" />

	<!-- Extra dates toggle -->
	<button
		onclick={() => (showExtra = !showExtra)}
		class="mb-4 text-xs font-medium text-text-muted transition-colors hover:text-accent"
	>
		{showExtra ? '− Ocultar datas extras' : '+ Adicionar datas especiais (eventos)'}
	</button>

	{#if showExtra}
		<div class="mb-4 animate-in rounded-2xl bg-surface p-4 ring-1 ring-surface-2">
			<p class="mb-3 text-xs text-text-muted">Dias avulsos além de sexta/sábado (ex: feriados, eventos).</p>
			<div class="mb-3 flex gap-2">
				<input bind:value={extraDate} type="date" class="flex-1 rounded-lg bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-accent/50" />
				<button onclick={addExtraDate} disabled={!extraDate} class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">+</button>
			</div>
			{#if extraDates.length > 0}
				<div class="flex flex-wrap gap-1.5">
					{#each extraDates as d}
						<span class="flex items-center gap-1 rounded-lg bg-accent/15 px-2.5 py-1.5 text-xs font-medium text-accent">
							{getDayName(d)} {formatDate(d)}
							<button onclick={() => removeExtraDate(d)} class="ml-0.5 text-accent/60 hover:text-accent">&times;</button>
						</span>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<button
		onclick={create}
		disabled={!startDate || !endDate}
		class="w-full rounded-lg bg-accent py-3 font-medium text-white transition-colors disabled:opacity-50 active:bg-accent/80"
	>
		Criar Escala
	</button>
</div>
