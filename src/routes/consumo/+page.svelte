<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { page } from '$app/state';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption, DISCOUNT } from '$lib/stores/consumption.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, round2, todayISO } from '$lib/utils';

	// Pre-select person from query param
	const preselectedPerson = page.url.searchParams.get('person');

	let step = $state<'person' | 'product' | 'custom' | 'done'>(preselectedPerson ? 'product' : 'person');
	let selectedPeople = $state<string[]>(preselectedPerson ? [preselectedPerson] : []);
	let selectedCategory = $state<string | null>(null);
	let lastAdded = $state<{ people: string[]; product: string; price: number } | null>(null);
	let customName = $state('');
	let customPrice = $state('');

	const selectedNames = $derived(
		selectedPeople.map((id) => collaborators.getById(id)?.name ?? '').filter(Boolean),
	);

	function togglePerson(id: string) {
		if (selectedPeople.includes(id)) {
			selectedPeople = selectedPeople.filter((p) => p !== id);
		} else {
			selectedPeople = [...selectedPeople, id];
		}
	}

	function goToProducts() {
		if (selectedPeople.length === 0) return;
		step = 'product';
		selectedCategory = null;
	}

	function finishAndReset(product: string, price: number) {
		lastAdded = { people: [...selectedNames], product, price };
		step = 'done';
		setTimeout(() => {
			step = 'person';
			selectedPeople = [];
			selectedCategory = null;
			lastAdded = null;
		}, 1300);
	}

	async function selectProduct(productId: string) {
		const product = products.getById(productId);
		if (!product || selectedPeople.length === 0) return;

		await consumption.addSplit(selectedPeople, {
			product_id: productId,
			quantity: 1,
			date: todayISO(),
		});

		const who = selectedNames.length > 1 ? `dividido entre ${selectedNames.join(', ')}` : `para ${selectedNames[0]}`;
		toast.success(`${product.name} ${who}`);
		finishAndReset(product.name, product.price);
	}

	async function addCustomItem() {
		const price = parseFloat(customPrice.replace(',', '.'));
		if (!customName.trim() || selectedPeople.length === 0) return;
		if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
			toast.error('Valor inválido');
			return;
		}

		// Store price * 1.25 so the existing 20% discount brings it back to the real value
		const inflatedPrice = round2(price / (1 - DISCOUNT));

		await consumption.addSplit(selectedPeople, {
			quantity: 1,
			date: todayISO(),
			custom_name: customName.trim(),
			custom_price: inflatedPrice,
		});

		const name = customName.trim();
		const who = selectedNames.length > 1 ? `dividido entre ${selectedNames.join(', ')}` : `para ${selectedNames[0]}`;
		toast.success(`${name} ${who}`);
		customName = '';
		customPrice = '';
		finishAndReset(name, price);
	}

	function reset() {
		if (step === 'custom') {
			step = 'product';
			customName = '';
			customPrice = '';
		} else if (selectedCategory) {
			selectedCategory = null;
		} else {
			step = 'person';
		}
	}
</script>

<PageHeader title="Registrar Consumo">
	{#if step !== 'person'}
		<button onclick={reset} class="text-sm font-medium text-accent transition-opacity active:opacity-60">
			{step === 'custom' ? 'Voltar' : selectedCategory ? 'Categorias' : 'Voltar'}
		</button>
	{/if}
</PageHeader>

<div class="px-4 py-4 pb-24">
	{#if step === 'person'}
		<p class="mb-3 text-sm text-text-muted">Quem consumiu? <span class="text-text-muted/70">(toque mais de um para dividir)</span></p>
		<div class="stagger grid grid-cols-2 gap-2">
			{#each collaborators.active as collab (collab.id)}
				{@const selected = selectedPeople.includes(collab.id)}
				<button
					onclick={() => togglePerson(collab.id)}
					class="pressable relative rounded-2xl p-4 text-center shadow-md shadow-black/10 transition-all
						{selected ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface'}"
				>
					{#if selected}
						<div class="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
							<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
						</div>
					{/if}
					<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-surface-2 to-surface-3 text-lg font-bold">
						{collab.name.slice(0, 2).toUpperCase()}
					</div>
					<div class="text-sm font-medium">{collab.name}</div>
				</button>
			{/each}
		</div>

	{:else if step === 'product'}
		<p class="mb-3 text-sm text-text-muted">
			O que <strong class="text-text">{selectedNames.join(', ')}</strong> consumiu?
			{#if selectedPeople.length > 1}<span class="text-accent">(dividido entre {selectedPeople.length})</span>{/if}
		</p>

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
				<button
					onclick={() => (step = 'custom')}
					class="pressable rounded-2xl border border-dashed border-surface-3 bg-surface/50 px-4 py-4 text-center text-sm font-medium text-text-muted shadow-md shadow-black/10"
				>
					+ Item avulso
				</button>
			</div>
		{:else}
			<div class="stagger divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each products.getByCategory(selectedCategory) as product (product.id)}
					<button
						onclick={() => selectProduct(product.id)}
						class="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors active:bg-surface-2"
					>
						<span class="text-sm">{product.name}</span>
						<span class="text-sm font-medium text-accent">
							{formatCurrency(product.price)}{#if selectedPeople.length > 1}<span class="text-text-muted"> · {formatCurrency(product.price / selectedPeople.length)}/un</span>{/if}
						</span>
					</button>
				{/each}
			</div>
		{/if}

	{:else if step === 'custom'}
		<p class="mb-3 text-sm text-text-muted">
			Item avulso para <strong class="text-text">{selectedNames.join(', ')}</strong>
			{#if selectedPeople.length > 1}<span class="text-accent">(dividido entre {selectedPeople.length})</span>{/if}
		</p>

		<div class="space-y-3 rounded-2xl bg-surface p-4 shadow-md shadow-black/10">
			<div>
				<label for="custom-name" class="mb-1 block text-xs text-text-muted">Descrição</label>
				<input
					id="custom-name"
					type="text"
					bind:value={customName}
					placeholder="Ex: rodízio, uber, etc"
					class="w-full rounded-xl bg-surface-2 px-4 py-3 text-sm text-text outline-none ring-1 ring-transparent focus:ring-accent/50"
				/>
			</div>
			<div>
				<label for="custom-price" class="mb-1 block text-xs text-text-muted">Valor total (R$)</label>
				<input
					id="custom-price"
					type="text"
					inputmode="decimal"
					bind:value={customPrice}
					placeholder="0,00"
					class="w-full rounded-xl bg-surface-2 px-4 py-3 text-sm text-text outline-none ring-1 ring-transparent focus:ring-accent/50"
				/>
			</div>
			<button
				onclick={addCustomItem}
				disabled={!customName.trim() || !customPrice}
				class="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
			>
				Adicionar
			</button>
		</div>

	{:else if step === 'done'}
		<div class="flex flex-col items-center justify-center py-16">
			<div class="animate-pop mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
				<svg class="h-10 w-10 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<path d="M20 6L9 17l-5-5" />
				</svg>
			</div>
			{#if lastAdded}
				<p class="animate-in text-center text-lg font-semibold">{lastAdded.product}</p>
				<p class="animate-in text-center text-sm text-text-muted" style="animation-delay: 80ms">
					{#if lastAdded.people.length > 1}
						dividido entre {lastAdded.people.join(', ')} &middot; {formatCurrency(lastAdded.price)}
					{:else}
						{lastAdded.people[0]} &middot; {formatCurrency(lastAdded.price)}
					{/if}
				</p>
			{/if}
		</div>
	{/if}
</div>

<!-- Sticky continue bar on the person step -->
{#if step === 'person' && selectedPeople.length > 0}
	<div class="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-lg px-4 pb-3">
		<button
			onclick={goToProducts}
			class="pressable w-full rounded-2xl bg-accent py-3.5 font-semibold text-white shadow-lg shadow-accent/30"
		>
			Continuar{selectedPeople.length > 1 ? ` · dividir entre ${selectedPeople.length}` : ` · ${selectedNames[0]}`}
		</button>
	</div>
{/if}
