<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate } from '$lib/utils';

	const collab = $derived(collaborators.getById(page.params.id));
	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);
	const DISCOUNT = 0.20;
	const total = $derived(
		entries.reduce((sum, e) => {
			const product = products.getById(e.product_id);
			return sum + (product ? product.price * e.quantity * (1 - DISCOUNT) : 0);
		}, 0)
	);

	let editing = $state(false);
	let editRate = $state(0);

	function startEdit() {
		if (!collab) return;
		editRate = collab.base_rate;
		editing = true;
	}

	async function saveRate() {
		if (!collab) return;
		await collaborators.update(collab.id, { base_rate: editRate });
		toast.success(`Valor atualizado para ${formatCurrency(editRate)}`);
		editing = false;
	}

	async function handleStars(v: number) {
		if (!collab) return;
		await collaborators.setStars(collab.id, v);
	}

	const roleLabels: Record<string, string> = { instrutor: 'Instrutor', garcom: 'Garçom', ambos: 'Ambos', bar: 'Bar', cozinha: 'Cozinha' };
</script>

{#if collab}
	<PageHeader title={collab.name} backHref="/colaboradores" />

	<div class="px-4 py-4">
		<div class="animate-in mb-4 rounded-2xl bg-surface p-5 shadow-lg shadow-black/20">
			<div class="mb-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-muted">{roleLabels[collab.role]}</span>
					<button
						onclick={async () => { await collaborators.update(collab.id, { fixed: !collab.fixed }); toast.success(collab.fixed ? 'Agora é freela' : 'Agora é fixo'); }}
						class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all
							{collab.fixed ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-surface-2 text-text-muted'}"
					>
						{collab.fixed ? 'FIXO' : 'FREELA'}
					</button>
				</div>
				<StarRating
					value={collab.stars}
					size="lg"
					onchange={handleStars}
				/>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-sm text-text-muted">Valor/dia</span>
				{#if editing}
					<div class="flex items-center gap-2">
						<input
							bind:value={editRate}
							type="number"
							class="w-24 rounded-xl bg-surface-2 px-3 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-accent/50"
						/>
						<button onclick={saveRate} class="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white">Salvar</button>
					</div>
				{:else}
					<button onclick={startEdit} class="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-3">{formatCurrency(collab.base_rate)}</button>
				{/if}
			</div>
		</div>

		<div class="mb-3 flex items-center justify-between" style="animation-delay: 80ms">
			<h2 class="font-semibold">Consumo</h2>
			<span class="rounded-lg bg-accent-soft px-2.5 py-1 text-sm font-semibold text-accent">{formatCurrency(total)}</span>
		</div>

		{#if entries.length === 0}
			<p class="py-10 text-center text-sm text-text-muted">Nenhum consumo registrado</p>
		{:else}
			<div class="stagger divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each entries as entry}
					{@const product = products.getById(entry.product_id)}
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<div class="text-sm font-medium">{product?.name ?? 'Produto removido'}</div>
							<div class="text-xs text-text-muted">{formatDate(entry.date)} &middot; {entry.quantity}x</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-sm font-medium">{formatCurrency((product?.price ?? 0) * entry.quantity)}</span>
							<button
								onclick={async () => { await consumption.remove(entry.id); toast.info('Consumo removido'); }}
								class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent-soft hover:text-accent"
								aria-label="Remover"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M18 6L6 18M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<PageHeader title="Não encontrado" backHref="/colaboradores" />
	<p class="py-8 text-center text-text-muted">Colaborador não encontrado.</p>
{/if}
