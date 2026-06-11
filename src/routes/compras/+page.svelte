<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDateFull } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';

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
	<Button href="/compras/nova" size="sm" class="shadow-md shadow-primary/20">+ Nova</Button>
</PageHeader>

<div class="px-4 py-4">
	<div class="animate-in mb-5 rounded-2xl bg-gradient-to-br from-warning/10 to-transparent p-5 text-center ring-1 ring-warning/20">
		<div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total pendente</div>
		<div class="mt-1 text-3xl font-bold text-warning">{formatCurrency(purchases.totalPending)}</div>
	</div>

	{#if purchases.list.length === 0}
		<div class="flex flex-col items-center py-12 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
				<ShoppingBag class="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
			</div>
			<p class="text-sm text-muted-foreground">Nenhuma compra registrada</p>
		</div>
	{:else}
		<div class="stagger space-y-2">
			{#each purchases.list.toSorted((a, b) => b.date.localeCompare(a.date)) as purchase}
				<div class="rounded-2xl bg-card px-4 py-4 shadow-md shadow-black/10 transition-opacity {purchase.reimbursed ? 'opacity-40' : ''}">
					<div class="flex items-center justify-between">
						<div class="text-lg font-bold">{formatCurrency(purchase.amount)}</div>
						<div class="text-xs text-muted-foreground">{formatDateFull(purchase.date)}</div>
					</div>
					{#if purchase.notes}
						<div class="mt-1 text-sm text-muted-foreground">{purchase.notes}</div>
					{/if}
					<div class="mt-3 flex gap-2">
						{#if !purchase.reimbursed}
							<Button
								variant="secondary"
								size="sm"
								class="pressable rounded-xl bg-success/15 text-xs font-semibold text-success ring-1 ring-success/30 hover:bg-success/25"
								onclick={() => reimburse(purchase.id)}
							>
								Marcar Ressarcido
							</Button>
						{:else}
							<Badge variant="secondary" class="h-auto rounded-xl px-4 py-2 text-muted-foreground">Ressarcido</Badge>
						{/if}
						<Button
							variant="destructive"
							size="sm"
							class="rounded-xl text-xs"
							onclick={() => remove(purchase.id)}
						>
							Remover
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
