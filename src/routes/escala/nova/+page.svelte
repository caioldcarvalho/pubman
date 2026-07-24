<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatDate, getDayName } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';

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

	let saving = $state(false);

	async function create() {
		if (!startDate || !endDate || saving) return;
		saving = true;
		try {
			const id = await schedule.addPeriod(startDate, endDate, extraDates);
			goto(`/escala/${id}`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Erro ao criar escala');
		} finally {
			saving = false;
		}
	}
</script>

<PageHeader title="Nova Escala" backHref="/escala" />

<div class="px-4 py-4">
	<p class="mb-4 text-sm text-muted-foreground">Selecione o período. Sextas e sábados serão incluídos automaticamente.</p>

	<div class="mb-4 space-y-1.5">
		<Label for="start-date" class="text-xs text-muted-foreground">Data inicial</Label>
		<Input id="start-date" type="date" bind:value={startDate} />
	</div>

	<div class="mb-4 space-y-1.5">
		<Label for="end-date" class="text-xs text-muted-foreground">Data final</Label>
		<Input id="end-date" type="date" bind:value={endDate} />
	</div>

	<!-- Extra dates toggle -->
	<button
		onclick={() => (showExtra = !showExtra)}
		class="mb-4 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
	>
		{showExtra ? '− Ocultar datas extras' : '+ Adicionar datas especiais (eventos)'}
	</button>

	{#if showExtra}
		<div class="mb-4 animate-in rounded-2xl bg-card p-4 ring-1 ring-border">
			<p class="mb-3 text-xs text-muted-foreground">Dias avulsos além de sexta/sábado (ex: feriados, eventos).</p>
			<div class="mb-3 flex gap-2">
				<Input id="extra-date" type="date" bind:value={extraDate} class="flex-1" aria-label="Data extra" />
				<Button onclick={addExtraDate} disabled={!extraDate}>+</Button>
			</div>
			{#if extraDates.length > 0}
				<div class="flex flex-wrap gap-1.5">
					{#each extraDates as d}
						<Badge class="bg-primary/15 text-primary">
							{getDayName(d)} {formatDate(d)}
							<button onclick={() => removeExtraDate(d)} class="ml-0.5 text-primary/60 hover:text-primary">&times;</button>
						</Badge>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<Button class="w-full" size="lg" onclick={create} disabled={!startDate || !endDate || saving}>
		{saving ? 'Criando…' : 'Criar Escala'}
	</Button>
</div>
