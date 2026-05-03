<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { formatCurrency } from '$lib/utils';

	let showAdd = $state(false);
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editPrice = $state(0);
	let editCategory = $state('');

	let newName = $state('');
	let newPrice = $state(0);
	let newCategory = $state('');

	let filterCategory = $state<string | null>(null);

	const displayProducts = $derived(
		filterCategory ? products.getByCategory(filterCategory) : products.active
	);

	async function addProduct() {
		if (!newName.trim() || newPrice <= 0) return;
		await products.add({
			name: newName.trim(),
			price: newPrice,
			category: newCategory.trim() || 'Outros',
			active: true,
		});
		newName = '';
		newPrice = 0;
		newCategory = '';
		showAdd = false;
	}

	function startEdit(id: string) {
		const p = products.getById(id);
		if (!p) return;
		editingId = id;
		editName = p.name;
		editPrice = p.price;
		editCategory = p.category;
	}

	async function saveEdit() {
		if (!editingId) return;
		await products.update(editingId, { name: editName, price: editPrice, category: editCategory });
		editingId = null;
	}
</script>

<PageHeader title="Cardápio">
	<button onclick={() => (showAdd = !showAdd)} class="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white">
		{showAdd ? 'Cancelar' : '+ Novo'}
	</button>
</PageHeader>

{#if showAdd}
	<form onsubmit={addProduct} class="border-b border-surface-2 bg-surface px-4 py-4">
		<input bind:value={newName} placeholder="Nome do produto" class="mb-2 w-full rounded-lg bg-surface-2 px-3 py-2 text-text outline-none focus:ring-2 focus:ring-accent" />
		<div class="mb-2 flex gap-2">
			<input bind:value={newPrice} type="number" step="0.1" placeholder="Preço" class="w-1/2 rounded-lg bg-surface-2 px-3 py-2 text-text outline-none focus:ring-2 focus:ring-accent" />
			<input bind:value={newCategory} placeholder="Categoria" class="w-1/2 rounded-lg bg-surface-2 px-3 py-2 text-text outline-none focus:ring-2 focus:ring-accent" />
		</div>
		<button type="submit" class="w-full rounded-lg bg-accent py-2 font-medium text-white">Adicionar</button>
	</form>
{/if}

<div class="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
	<button
		onclick={() => (filterCategory = null)}
		class="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
			{filterCategory === null ? 'bg-accent text-white' : 'bg-surface-2 text-text-muted'}"
	>
		Todos
	</button>
	{#each products.categories as cat}
		<button
			onclick={() => (filterCategory = cat)}
			class="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
				{filterCategory === cat ? 'bg-accent text-white' : 'bg-surface-2 text-text-muted'}"
		>
			{cat}
		</button>
	{/each}
</div>

<div class="divide-y divide-surface-2">
	{#each displayProducts as product}
		{#if editingId === product.id}
			<div class="bg-surface px-4 py-3">
				<input bind:value={editName} class="mb-2 w-full rounded-lg bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-accent" />
				<div class="mb-2 flex gap-2">
					<input bind:value={editPrice} type="number" step="0.1" class="w-1/2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-accent" />
					<input bind:value={editCategory} class="w-1/2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-accent" />
				</div>
				<div class="flex gap-2">
					<button onclick={saveEdit} class="flex-1 rounded-lg bg-accent py-1.5 text-sm font-medium text-white">Salvar</button>
					<button onclick={() => (editingId = null)} class="flex-1 rounded-lg bg-surface-2 py-1.5 text-sm text-text-muted">Cancelar</button>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-between px-4 py-3">
				<div>
					<div class="text-sm font-medium">{product.name}</div>
					<div class="text-xs text-text-muted">{product.category}</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">{formatCurrency(product.price)}</span>
					<button onclick={() => startEdit(product.id)} class="text-text-muted" aria-label="Editar">
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
					</button>
					<button onclick={async () => await products.remove(product.id)} class="text-text-muted" aria-label="Remover">
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		{/if}
	{/each}
</div>

<style>
	.no-scrollbar::-webkit-scrollbar { display: none; }
	.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
