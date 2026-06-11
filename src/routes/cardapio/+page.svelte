<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { formatCurrency } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import X from '@lucide/svelte/icons/x';

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
	<Button size="sm" onclick={() => (showAdd = !showAdd)}>
		{showAdd ? 'Cancelar' : '+ Novo'}
	</Button>
</PageHeader>

{#if showAdd}
	<form onsubmit={addProduct} class="border-b border-border bg-card px-4 py-4">
		<Input bind:value={newName} placeholder="Nome do produto" class="mb-2" />
		<div class="mb-2 flex gap-2">
			<Input bind:value={newPrice} type="number" step="0.1" placeholder="Preço" class="w-1/2" />
			<Input bind:value={newCategory} placeholder="Categoria" class="w-1/2" />
		</div>
		<Button type="submit" class="w-full">Adicionar</Button>
	</form>
{/if}

<div class="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
	<button
		onclick={() => (filterCategory = null)}
		class="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
			{filterCategory === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
	>
		Todos
	</button>
	{#each products.categories as cat}
		<button
			onclick={() => (filterCategory = cat)}
			class="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
				{filterCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
		>
			{cat}
		</button>
	{/each}
</div>

<div class="divide-y divide-border">
	{#each displayProducts as product}
		{#if editingId === product.id}
			<div class="bg-card px-4 py-3">
				<Input bind:value={editName} class="mb-2 text-sm" />
				<div class="mb-2 flex gap-2">
					<Input bind:value={editPrice} type="number" step="0.1" class="w-1/2 text-sm" />
					<Input bind:value={editCategory} class="w-1/2 text-sm" />
				</div>
				<div class="flex gap-2">
					<Button size="sm" class="flex-1" onclick={saveEdit}>Salvar</Button>
					<Button variant="secondary" size="sm" class="flex-1" onclick={() => (editingId = null)}>Cancelar</Button>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-between px-4 py-3">
				<div>
					<div class="text-sm font-medium">{product.name}</div>
					<div class="text-xs text-muted-foreground">{product.category}</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">{formatCurrency(product.price)}</span>
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-muted-foreground"
						onclick={() => startEdit(product.id)}
						aria-label="Editar"
					>
						<SquarePen />
					</Button>
					<Button
						variant="destructive"
						size="icon-sm"
						onclick={async () => await products.remove(product.id)}
						aria-label="Remover"
					>
						<X />
					</Button>
				</div>
			</div>
		{/if}
	{/each}
</div>

<style>
	.no-scrollbar::-webkit-scrollbar { display: none; }
	.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
