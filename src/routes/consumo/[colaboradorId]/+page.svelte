<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption, entryValue } from '$lib/stores/consumption.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate } from '$lib/utils';

	const collab = $derived(collaborators.getById(page.params.colaboradorId));
	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);
	const getPrice = (id: string) => products.getById(id)?.price ?? 0;
	const total = $derived(
		entries.reduce((sum, e) => sum + entryValue(e, getPrice), 0)
	);

	function buildShareText(): string {
		if (!collab) return '';
		const lines: string[] = [`🍺 *Consumo - ${collab.name}*`, ''];
		for (const e of entries) {
			const product = e.product_id ? products.getById(e.product_id) : null;
			const name = e.custom_name ?? product?.name ?? '?';
			const split = e.split_count > 1 ? ` ÷${e.split_count}` : '';
			lines.push(`• ${name} x${e.quantity}${split} — ${formatCurrency(entryValue(e, getPrice))}`);
		}
		lines.push('', `*Total: ${formatCurrency(total)}*`);
		return lines.join('\n');
	}

	async function share() {
		const text = buildShareText();
		if (navigator.share) {
			await navigator.share({ text });
		} else {
			await navigator.clipboard.writeText(text);
			toast.success('Copiado para a área de transferência');
		}
	}
</script>

{#if collab}
	<PageHeader title="Consumo - {collab.name}" backHref="/consumo">
		{#if entries.length > 0}
			<button
				onclick={share}
				class="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-accent/20 transition-all active:scale-95"
			>
				Compartilhar
			</button>
		{/if}
	</PageHeader>

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
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<div class="text-sm font-medium">
								{entry.custom_name ?? product?.name ?? '?'}
								{#if entry.custom_name}<span class="text-xs text-text-muted"> (avulso)</span>{/if}
							</div>
							<div class="text-xs text-text-muted">
								{formatDate(entry.date)} &middot; {entry.quantity}x
								{#if entry.split_count > 1}<span class="text-accent"> &middot; ÷{entry.split_count}</span>{/if}
							</div>
						</div>
						<span class="text-sm">{formatCurrency(entryValue(entry, getPrice))}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<PageHeader title="Não encontrado" backHref="/consumo" />
{/if}
