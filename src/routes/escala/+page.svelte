<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { formatDate } from '$lib/utils';
</script>

<PageHeader title="Escalas">
	<a href="/escala/nova" class="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white">+ Nova</a>
</PageHeader>

<div class="px-4 py-4">
	{#if schedule.periods.length === 0}
		<p class="py-8 text-center text-sm text-text-muted">Nenhuma escala criada</p>
	{:else}
		<div class="space-y-3">
			{#each schedule.periods as period}
				{@const dates = schedule.getDatesByPeriod(period.id)}
				{@const totalAssignments = dates.reduce((sum, d) => sum + schedule.getAssignments(d.id).length, 0)}
				<a href="/escala/{period.id}" class="block rounded-xl bg-surface p-4 transition-colors active:bg-surface-2">
					<div class="font-medium">
						{formatDate(period.start_date)} - {formatDate(period.end_date)}
					</div>
					<div class="mt-1 text-sm text-text-muted">
						{dates.length} datas &middot; {totalAssignments} escalados
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
