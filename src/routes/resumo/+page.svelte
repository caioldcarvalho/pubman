<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency } from '$lib/utils';

	const payroll = $derived(
		collaborators.active.map((collab) => {
			const assignments = schedule.assignments.filter((a) => a.collaborator_id === collab.id && !a.payment_id);
			const earned = assignments.reduce((sum, a) => sum + (a.rate_override ?? collab.base_rate), 0);
			const consumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid));
			return { collab, earned, consumed, net: earned - consumed };
		}).filter((r) => r.net !== 0)
	);

	const totalPayroll = $derived(payroll.reduce((sum, r) => sum + Math.max(0, r.net), 0));
	const totalReimbursement = $derived(purchases.totalPending);
	const grandTotal = $derived(totalPayroll + totalReimbursement);

	async function reimburse(id: string) {
		await purchases.markReimbursed(id);
		toast.success('Ressarcido');
	}
</script>

<PageHeader title="Resumo Financeiro" />

<div class="px-4 py-4">
	<!-- Grand total -->
	<div class="animate-in mb-6 rounded-2xl bg-gradient-to-br from-accent/20 via-accent/10 to-transparent p-6 text-center ring-1 ring-accent/20 shadow-lg shadow-accent/10">
		<div class="text-xs font-bold uppercase tracking-wider text-text-muted">Total a desembolsar</div>
		<div class="mt-2 text-4xl font-bold text-gradient">{formatCurrency(grandTotal)}</div>
	</div>

	<div class="stagger grid grid-cols-2 gap-3">
		<div class="rounded-2xl bg-surface p-4 text-center shadow-md shadow-black/10">
			<div class="text-xl font-bold text-success">{formatCurrency(totalPayroll)}</div>
			<div class="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Freelas</div>
		</div>
		<div class="rounded-2xl bg-surface p-4 text-center shadow-md shadow-black/10">
			<div class="text-xl font-bold text-warning">{formatCurrency(totalReimbursement)}</div>
			<div class="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Reembolsos</div>
		</div>
	</div>

	<!-- Payroll breakdown -->
	{#if payroll.length > 0}
		<h2 class="mt-6 mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">Pagamento Freelas</h2>
		<div class="stagger divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
			{#each payroll as r}
				<div class="flex items-center justify-between px-4 py-3.5">
					<div>
						<div class="text-sm font-medium">{r.collab.name}</div>
						<div class="text-xs text-text-muted">
							{formatCurrency(r.earned)} - {formatCurrency(r.consumed)}
						</div>
					</div>
					<div class="rounded-lg px-2.5 py-1 text-sm font-bold {r.net >= 0 ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}">
						{formatCurrency(r.net)}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Reimbursement breakdown -->
	{#if purchases.pending.length > 0}
		<h2 class="mt-6 mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">Reembolsos Pendentes</h2>
		<div class="stagger divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
			{#each purchases.pending as purchase}
				<div class="flex items-center justify-between px-4 py-3.5">
					<div>
						<div class="text-sm font-semibold">{formatCurrency(purchase.amount)}</div>
						{#if purchase.notes}
							<div class="text-xs text-text-muted">{purchase.notes}</div>
						{/if}
					</div>
					<button
						onclick={() => reimburse(purchase.id)}
						class="pressable rounded-xl bg-success/15 px-3 py-1.5 text-xs font-semibold text-success ring-1 ring-success/30"
					>
						Ressarcir
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
