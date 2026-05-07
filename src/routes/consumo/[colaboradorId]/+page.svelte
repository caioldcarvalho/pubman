<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { DISCOUNT } from '$lib/stores/consumption.svelte';
	import { formatCurrency, formatDate } from '$lib/utils';

	const collab = $derived(collaborators.getById(page.params.colaboradorId));
	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);
	const total = $derived(
		entries.reduce((sum, e) => {
			if (e.custom_price != null) {
				// custom_price is stored inflated; show real value: inflated * (1 - DISCOUNT)
				return sum + e.custom_price * (1 - DISCOUNT) * e.quantity;
			}
			const p = products.getById(e.product_id!);
			return sum + (p ? p.price * e.quantity : 0);
		}, 0)
	);
</script>

{#if collab}
	<PageHeader title="Consumo - {collab.name}" backHref="/consumo" />

	<div class="px-4 py-4">
		<div class="mb-4 rounded-xl bg-surface p-4 text-center">
			<div class="text-2xl font-bold text-accent">{formatCurrency(total)}</div>
			<div class="text-sm text-text-muted">{entries.length} items</div>
		</div>

		{#if entries.length === 0}
			<p class="py-8 text-center text-sm text-text-muted">Nenhum consumo registrado</p>
		{:else}
			<div class="divide-y divide-surface-2 rounded-xl bg-surface">
				{#each entries as entry}
					{@const product = entry.product_id ? products.getById(entry.product_id) : null}
					{@const price = entry.custom_price != null
						? entry.custom_price * (1 - DISCOUNT)
						: (product?.price ?? 0)}
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<div class="text-sm font-medium">
								{entry.custom_name ?? product?.name ?? '?'}
								{#if entry.custom_name}<span class="text-xs text-text-muted"> (avulso)</span>{/if}
							</div>
							<div class="text-xs text-text-muted">{formatDate(entry.date)} &middot; {entry.quantity}x</div>
						</div>
						<span class="text-sm">{formatCurrency(price * entry.quantity)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<PageHeader title="Não encontrado" backHref="/consumo" />
{/if}
