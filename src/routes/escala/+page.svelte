<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { schedule, type SchedulePeriod } from '$lib/stores/schedule.svelte';
	import { formatDate, todayISO } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	const today = todayISO();
	const activePeriods = $derived(schedule.periods.filter((p) => p.end_date >= today));
	const archivedPeriods = $derived(schedule.periods.filter((p) => p.end_date < today));

	let showArchived = $state(false);

	function periodInfo(period: SchedulePeriod) {
		const dates = schedule.getDatesByPeriod(period.id);
		const totalAssignments = dates.reduce((sum, d) => sum + schedule.getTitulares(d.id).length, 0);
		return { dates, totalAssignments };
	}
</script>

<PageHeader title="Escalas">
	<Button href="/escala/nova" size="sm">+ Nova</Button>
</PageHeader>

<div class="px-4 py-4">
	{#if schedule.periods.length === 0}
		<p class="py-8 text-center text-sm text-muted-foreground">Nenhuma escala criada</p>
	{:else}
		{#if activePeriods.length === 0}
			<p class="py-4 text-center text-sm text-muted-foreground">Nenhuma escala ativa ou futura</p>
		{:else}
			<div class="space-y-3">
				{#each activePeriods as period (period.id)}
					{@const { dates, totalAssignments } = periodInfo(period)}
					<a href="/escala/{period.id}" class="block rounded-xl bg-card p-4 transition-colors active:bg-muted">
						<div class="font-medium">
							{formatDate(period.start_date)} - {formatDate(period.end_date)}
						</div>
						<div class="mt-1 text-sm text-muted-foreground">
							{dates.length} datas &middot; {totalAssignments} escalados
						</div>
					</a>
				{/each}
			</div>
		{/if}

		{#if archivedPeriods.length > 0}
			<button
				onclick={() => (showArchived = !showArchived)}
				class="mt-5 flex w-full items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-sm font-medium text-muted-foreground"
			>
				<span>Arquivadas ({archivedPeriods.length})</span>
				<ChevronDown class="h-4 w-4 transition-transform {showArchived ? 'rotate-180' : ''}" />
			</button>
			{#if showArchived}
				<div class="mt-3 space-y-3">
					{#each archivedPeriods as period (period.id)}
						{@const { dates, totalAssignments } = periodInfo(period)}
						<a href="/escala/{period.id}" class="block rounded-xl bg-card p-4 opacity-70 transition-colors active:bg-muted active:opacity-100">
							<div class="font-medium">
								{formatDate(period.start_date)} - {formatDate(period.end_date)}
							</div>
							<div class="mt-1 text-sm text-muted-foreground">
								{dates.length} datas &middot; {totalAssignments} escalados
							</div>
						</a>
					{/each}
				</div>
			{/if}
		{/if}
	{/if}
</div>
