<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { page } from '$app/state';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, todayISO } from '$lib/utils';

	// Pre-select person from query param
	const preselectedPerson = page.url.searchParams.get('person');

	let step = $state<'person' | 'product'| 'done'>(preselectedPerson ? 'product' : 'person');
	let selectedPerson = $state<string | null>(preselectedPerson);
	let selectedCategory = $state<string | null>(null);
	let lastAdded = $state<{ person: string; product: string; price: number } | null>(null);

	const person = $derived(selectedPerson ? collaborators.getById(selectedPerson) : null);

	function selectPerson(id: string) {
		selectedPerson = id;
		step = 'product';
		selectedCategory = null;
	}

	async function selectProduct(productId: string) {
		const product = products.getById(productId);
		if (!product || !selectedPerson) return;

		await consumption.add({
			collaborator_id: selectedPerson,
			product_id: productId,
			quantity: 1,
			date: todayISO(),
		});

		lastAdded = {
			person: person?.name ?? '',
			product: product.name,
			price: product.price,
		};

		toast.success(`${product.name} adicionado para ${person?.name}`);

		step = 'done';
		setTimeout(() => {
			step = 'person';
			selectedPerson = null;
			selectedCategory = null;
			lastAdded = null;
		}, 1200);
	}

	function reset() {
		if (selectedCategory) {
			selectedCategory = null;
		} else {
			step = 'person';
			selectedPerson = null;
			selectedCategory = null;
		}
	}
</script>

<PageHeader title="Registrar Consumo">
	{#if step !== 'person'}
		<button onclick={reset} class="text-sm font-medium text-accent transition-opacity active:opacity-60">
			{selectedCategory ? 'Categorias' : 'Voltar'}
		</button>
	{/if}
</PageHeader>

<div class="px-4 py-4">
	{#if step === 'person'}
		<p class="mb-3 text-sm text-text-muted">Quem consumiu?</p>
		<div class="stagger grid grid-cols-2 gap-2">
			{#each collaborators.active as collab}
				<button
					onclick={() => selectPerson(collab.id)}
					class="pressable rounded-2xl bg-surface p-4 text-center shadow-md shadow-black/10"
				>
					<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-surface-2 to-surface-3 text-lg font-bold">
						{collab.name.slice(0, 2).toUpperCase()}
					</div>
					<div class="text-sm font-medium">{collab.name}</div>
				</button>
			{/each}
		</div>

	{:else if step === 'product'}
		<p class="mb-3 text-sm text-text-muted">O que <strong class="text-text">{person?.name}</strong> consumiu?</p>

		{#if !selectedCategory}
			<div class="stagger grid grid-cols-2 gap-2">
				{#each products.categories as cat}
					<button
						onclick={() => (selectedCategory = cat)}
						class="pressable rounded-2xl bg-surface px-4 py-4 text-center text-sm font-medium shadow-md shadow-black/10"
					>
						{cat}
					</button>
				{/each}
			</div>
		{:else}
			<div class="stagger divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each products.getByCategory(selectedCategory) as product}
					<button
						onclick={() => selectProduct(product.id)}
						class="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors active:bg-surface-2"
					>
						<span class="text-sm">{product.name}</span>
						<span class="text-sm font-medium text-accent">{formatCurrency(product.price)}</span>
					</button>
				{/each}
			</div>
		{/if}

	{:else if step === 'done'}
		<div class="flex flex-col items-center justify-center py-16">
			<div class="animate-pop mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
				<svg class="h-10 w-10 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<path d="M20 6L9 17l-5-5" />
				</svg>
			</div>
			{#if lastAdded}
				<p class="animate-in text-center text-lg font-semibold">{lastAdded.product}</p>
				<p class="animate-in text-sm text-text-muted" style="animation-delay: 80ms">
					{lastAdded.person} &middot; {formatCurrency(lastAdded.price)}
				</p>
			{/if}
		</div>
	{/if}
</div>
