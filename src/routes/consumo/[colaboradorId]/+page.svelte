<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { formatCurrency, formatDate } from '$lib/utils';

	const collab = $derived(collaborators.getById(page.params.colaboradorId));
	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);
	const total = $derived(
		entries.reduce((sum, e) => {
			const p = products.getById(e.product_id);
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
					{@const product = products.getById(entry.product_id)}
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<div class="text-sm font-medium">{product?.name ?? '?'}</div>
							<div class="text-xs text-text-muted">{formatDate(entry.date)} &middot; {entry.quantity}x</div>
						</div>
						<span class="text-sm">{formatCurrency((product?.price ?? 0) * entry.quantity)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<PageHeader title="Não encontrado" backHref="/consumo" />
{/if}
