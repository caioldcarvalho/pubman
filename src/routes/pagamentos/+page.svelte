<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { formatCurrency, todayISO } from '$lib/utils';

	const report = $derived(
		collaborators.active.map((collab) => {
			const assignments = schedule.getPastAssignments(collab.id, todayISO());
			const daysWorked = assignments.length;
			const earned = assignments.reduce((sum, a) => sum + (a.rate_override ?? collab.base_rate), 0);
			const consumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid));
			return {
				collab,
				daysWorked,
				earned,
				consumed,
				net: earned - consumed,
			};
		}).filter((r) => r.daysWorked > 0 || r.consumed > 0)
	);

	const totalNet = $derived(report.reduce((sum, r) => sum + r.net, 0));
</script>

<PageHeader title="Pagamentos" />

<div class="px-4 py-4">
	{#if report.length === 0}
		<div class="flex flex-col items-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-2">
				<svg class="h-8 w-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 14a1 1 0 100 2 1 1 0 000-2z" />
				</svg>
			</div>
			<p class="text-sm text-text-muted">Nenhum pagamento pendente.</p>
			<p class="mt-1 text-xs text-text-muted">Escale colaboradores e registre consumo primeiro.</p>
		</div>
	{:else}
		<div class="animate-in mb-5 rounded-2xl bg-gradient-to-br from-accent/15 to-transparent p-5 text-center ring-1 ring-accent/20">
			<div class="text-xs font-medium uppercase tracking-wider text-text-muted">Total a pagar</div>
			<div class="mt-1 text-3xl font-bold text-gradient">{formatCurrency(totalNet)}</div>
		</div>

		<div class="stagger space-y-2">
			{#each report as r}
				<a href="/pagamentos/{r.collab.id}" class="pressable flex items-center justify-between rounded-2xl bg-surface px-4 py-4 shadow-md shadow-black/10">
					<div>
						<div class="font-medium">{r.collab.name}</div>
						<div class="mt-0.5 text-xs text-text-muted">
							{r.daysWorked} dia{r.daysWorked !== 1 ? 's' : ''} &middot; consumo {formatCurrency(r.consumed)}
						</div>
					</div>
					<div class="flex items-center gap-2">
						<div class="rounded-lg px-2.5 py-1 text-right text-sm font-bold
							{r.net >= 0 ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}">
							{formatCurrency(r.net)}
						</div>
						<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" /></svg>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
