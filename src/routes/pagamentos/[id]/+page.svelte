<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate, getDayName, todayISO } from '$lib/utils';

	const collab = $derived(collaborators.getById(page.params.id));

	const assignments = $derived(
		collab ? schedule.getPastAssignments(collab.id, todayISO()) : []
	);

	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);

	const totalEarned = $derived(
		collab ? assignments.reduce((sum, a) => sum + (a.rate_override ?? collab.base_rate), 0) : 0
	);

	const DISCOUNT = 0.20;
	const totalConsumed = $derived(
		entries.reduce((sum, e) => {
			const price = e.custom_price ?? (products.getById(e.product_id!)?.price ?? 0);
			return sum + price * e.quantity * (1 - DISCOUNT);
		}, 0)
	);

	const net = $derived(totalEarned - totalConsumed);

	async function setRateOverride(assignmentId: string, value: string) {
		const numVal = parseFloat(value);
		await schedule.updateAssignmentRate(assignmentId, isNaN(numVal) ? null : numVal);
	}

	async function markPaid() {
		if (!collab) return;
		await schedule.clearAssignmentsForCollaborator(collab.id);
		await consumption.clearByCollaborator(collab.id);
		toast.success(`Pagamento de ${collab.name} finalizado`);
		goto('/pagamentos');
	}

	function getDateForAssignment(assignment: { date_id: string }): string {
		return schedule.getDateById(assignment.date_id)?.date ?? '';
	}
</script>

{#if collab}
	<PageHeader title={collab.name} backHref="/pagamentos" />

	<div class="px-4 py-4">
		<!-- Summary -->
		<div class="animate-in mb-5 grid grid-cols-3 gap-2">
			<div class="rounded-2xl bg-surface p-3 text-center shadow-md shadow-black/10">
				<div class="text-lg font-bold text-success">{formatCurrency(totalEarned)}</div>
				<div class="text-[10px] font-medium uppercase tracking-wider text-text-muted">Ganhou</div>
			</div>
			<div class="rounded-2xl bg-surface p-3 text-center shadow-md shadow-black/10">
				<div class="text-lg font-bold text-accent">{formatCurrency(totalConsumed)}</div>
				<div class="text-[10px] font-medium uppercase tracking-wider text-text-muted">Consumiu</div>
			</div>
			<div class="rounded-2xl p-3 text-center shadow-md shadow-black/10
				{net >= 0 ? 'bg-success/10 ring-1 ring-success/20' : 'bg-accent/10 ring-1 ring-accent/20'}">
				<div class="text-lg font-bold {net >= 0 ? 'text-success' : 'text-accent'}">{formatCurrency(net)}</div>
				<div class="text-[10px] font-medium uppercase tracking-wider text-text-muted">Líquido</div>
			</div>
		</div>

		<!-- Days worked -->
		<h2 class="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">Dias trabalhados</h2>
		{#if assignments.length === 0}
			<p class="mb-5 text-sm text-text-muted">Nenhum dia registrado</p>
		{:else}
			<div class="stagger mb-5 divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each assignments as assignment}
					{@const dateStr = getDateForAssignment(assignment)}
					<div class="flex items-center justify-between px-4 py-3">
						<div class="text-sm">
							<span class="font-medium">{getDayName(dateStr)}</span>
							<span class="text-text-muted"> {formatDate(dateStr)}</span>
						</div>
						<input
							type="number"
							value={assignment.rate_override ?? collab.base_rate}
							onchange={(e) => setRateOverride(assignment.id, e.currentTarget.value)}
							class="w-24 rounded-xl bg-surface-2 px-3 py-1.5 text-right text-sm font-medium outline-none transition-shadow focus:ring-2 focus:ring-accent/50"
						/>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Consumption -->
		<h2 class="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">Consumo</h2>
		{#if entries.length === 0}
			<p class="mb-5 text-sm text-text-muted">Nenhum consumo</p>
		{:else}
			<div class="stagger mb-5 divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each entries as entry}
					{@const product = entry.product_id ? products.getById(entry.product_id) : null}
					{@const name = entry.custom_name ?? product?.name ?? '?'}
					{@const price = entry.custom_price ?? product?.price ?? 0}
					<div class="flex items-center justify-between px-4 py-3">
						<div class="text-sm">{name} <span class="text-text-muted">x{entry.quantity}</span></div>
						<span class="text-sm font-medium text-accent">{formatCurrency(price * entry.quantity * (1 - DISCOUNT))}</span>
					</div>
				{/each}
			</div>
		{/if}

		<button
			onclick={markPaid}
			class="pressable w-full rounded-2xl bg-success py-3.5 text-center font-semibold text-bg shadow-lg shadow-success/20 transition-all"
		>
			Marcar como Pago
		</button>
	</div>
{:else}
	<PageHeader title="Não encontrado" backHref="/pagamentos" />
{/if}
