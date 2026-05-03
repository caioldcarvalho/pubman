<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDateFull } from '$lib/utils';

	async function reimburse(id: string) {
		await purchases.markReimbursed(id);
		toast.success('Compra marcada como ressarcida');
	}

	async function remove(id: string) {
		await purchases.remove(id);
		toast.info('Compra removida');
	}
</script>

<PageHeader title="Compras / Reembolsos">
	<a href="/compras/nova" class="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-accent/20 transition-all active:scale-95">+ Nova</a>
</PageHeader>

<div class="px-4 py-4">
	<div class="animate-in mb-5 rounded-2xl bg-gradient-to-br from-warning/10 to-transparent p-5 text-center ring-1 ring-warning/20">
		<div class="text-xs font-medium uppercase tracking-wider text-text-muted">Total pendente</div>
		<div class="mt-1 text-3xl font-bold text-warning">{formatCurrency(purchases.totalPending)}</div>
	</div>

	{#if purchases.list.length === 0}
		<div class="flex flex-col items-center py-12 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-2">
				<svg class="h-8 w-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
				</svg>
			</div>
			<p class="text-sm text-text-muted">Nenhuma compra registrada</p>
		</div>
	{:else}
		<div class="stagger space-y-2">
			{#each purchases.list.toSorted((a, b) => b.date.localeCompare(a.date)) as purchase}
				<div class="rounded-2xl bg-surface px-4 py-4 shadow-md shadow-black/10 transition-opacity {purchase.reimbursed ? 'opacity-40' : ''}">
					<div class="flex items-center justify-between">
						<div class="text-lg font-bold">{formatCurrency(purchase.amount)}</div>
						<div class="text-xs text-text-muted">{formatDateFull(purchase.date)}</div>
					</div>
					{#if purchase.notes}
						<div class="mt-1 text-sm text-text-muted">{purchase.notes}</div>
					{/if}
					<div class="mt-3 flex gap-2">
						{#if !purchase.reimbursed}
							<button
								onclick={() => reimburse(purchase.id)}
								class="pressable rounded-xl bg-success/15 px-4 py-2 text-xs font-semibold text-success ring-1 ring-success/30"
							>
								Marcar Ressarcido
							</button>
						{:else}
							<span class="rounded-xl bg-surface-2 px-4 py-2 text-xs font-medium text-text-muted">Ressarcido</span>
						{/if}
						<button
							onclick={() => remove(purchase.id)}
							class="rounded-xl bg-surface-2 px-4 py-2 text-xs text-text-muted transition-colors hover:text-accent"
						>
							Remover
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
