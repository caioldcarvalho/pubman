<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { page } from '$app/state';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption, DISCOUNT } from '$lib/stores/consumption.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, round2, todayISO } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Check from '@lucide/svelte/icons/check';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';

	// Pre-select person from query param
	const preselectedPerson = page.url.searchParams.get('person');

	let step = $state<'person' | 'product' | 'custom' | 'done'>(preselectedPerson ? 'product' : 'person');
	let selectedPeople = $state<string[]>(preselectedPerson ? [preselectedPerson] : []);
	let selectedCategory = $state<string | null>(null);
	let lastAdded = $state<{ people: string[]; product: string; price: number } | null>(null);
	let customName = $state('');
	let customPrice = $state('');
	let pending = $state<Record<string, number>>({});
	let saving = $state(false);

	const pendingCount = $derived(Object.values(pending).reduce((a, b) => a + b, 0));
	const pendingTotal = $derived(
		Object.entries(pending).reduce(
			(sum, [id, qty]) => sum + (products.getById(id)?.price ?? 0) * qty,
			0,
		),
	);

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
			pending = {};
			lastAdded = null;
		}, 1300);
	}

	function incPending(productId: string) {
		pending = { ...pending, [productId]: (pending[productId] ?? 0) + 1 };
	}

	function decPending(productId: string) {
		const qty = (pending[productId] ?? 0) - 1;
		const next = { ...pending };
		if (qty <= 0) delete next[productId];
		else next[productId] = qty;
		pending = next;
	}

	async function confirmPending() {
		if (saving || pendingCount === 0 || selectedPeople.length === 0) return;
		saving = true;
		try {
			const items = Object.entries(pending).map(([product_id, quantity]) => ({
				product_id,
				quantity,
			}));
			await consumption.addSplitBatch(selectedPeople, items, todayISO());

			const summary = items
				.map((i) => `${i.quantity}× ${products.getById(i.product_id)?.name ?? '?'}`)
				.join(', ');
			const who = selectedNames.length > 1 ? `dividido entre ${selectedNames.join(', ')}` : `para ${selectedNames[0]}`;
			toast.success(`${summary} ${who}`);
			const total = pendingTotal;
			pending = {};
			finishAndReset(summary, total);
		} finally {
			saving = false;
		}
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
			pending = {};
		}
	}
</script>

<PageHeader title="Registrar Consumo">
	{#if step !== 'person'}
		<Button variant="link" size="sm" onclick={reset}>
			{step === 'custom' ? 'Voltar' : selectedCategory ? 'Categorias' : 'Voltar'}
		</Button>
	{/if}
</PageHeader>

<div class="px-4 py-4 pb-24">
	{#if step === 'person'}
		<p class="mb-3 text-sm text-muted-foreground">Quem consumiu? <span class="text-muted-foreground/70">(toque mais de um para dividir)</span></p>
		<div class="stagger grid grid-cols-2 gap-2">
			{#each collaborators.active as collab (collab.id)}
				{@const selected = selectedPeople.includes(collab.id)}
				<button
					onclick={() => togglePerson(collab.id)}
					class="pressable relative rounded-2xl p-4 text-center shadow-md shadow-black/10 transition-all
						{selected ? 'bg-primary/15 ring-2 ring-primary' : 'bg-card'}"
				>
					{#if selected}
						<div class="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
							<Check class="h-3 w-3" strokeWidth={3} />
						</div>
					{/if}
					<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-muted to-accent text-lg font-bold">
						{collab.name.slice(0, 2).toUpperCase()}
					</div>
					<div class="text-sm font-medium">{collab.name}</div>
				</button>
			{/each}
		</div>

	{:else if step === 'product'}
		<p class="mb-3 text-sm text-muted-foreground">
			O que <strong class="text-foreground">{selectedNames.join(', ')}</strong> consumiu?
			{#if selectedPeople.length > 1}<span class="text-primary">(dividido entre {selectedPeople.length})</span>{/if}
		</p>

		{#if !selectedCategory}
			<div class="stagger grid grid-cols-2 gap-2">
				{#each products.categories as cat}
					<button
						onclick={() => (selectedCategory = cat)}
						class="pressable rounded-2xl bg-card px-4 py-4 text-center text-sm font-medium shadow-md shadow-black/10"
					>
						{cat}
					</button>
				{/each}
				<button
					onclick={() => (step = 'custom')}
					class="pressable rounded-2xl border border-dashed border-border bg-card/50 px-4 py-4 text-center text-sm font-medium text-muted-foreground shadow-md shadow-black/10"
				>
					+ Item avulso
				</button>
			</div>
		{:else}
			<div class="stagger divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
				{#each products.getByCategory(selectedCategory) as product (product.id)}
					{@const qty = pending[product.id] ?? 0}
					<div class="flex items-center transition-colors {qty > 0 ? 'bg-primary/10' : ''}">
						<button
							onclick={() => (pendingCount > 0 ? incPending(product.id) : selectProduct(product.id))}
							class="flex min-w-0 flex-1 items-center justify-between py-3.5 pl-4 pr-2 text-left transition-colors active:bg-muted"
						>
							<span class="truncate text-sm">{product.name}</span>
							<span class="ml-2 shrink-0 text-sm font-medium text-primary">
								{formatCurrency(product.price)}{#if selectedPeople.length > 1}<span class="text-muted-foreground"> · {formatCurrency(product.price / selectedPeople.length)}/un</span>{/if}
							</span>
						</button>
						<div class="flex shrink-0 items-center gap-1 py-2 pl-1 pr-3">
							{#if qty > 0}
								<Button
									variant="secondary"
									size="icon-sm"
									class="rounded-full"
									onclick={() => decPending(product.id)}
									aria-label="Remover um {product.name}"
								>
									<Minus />
								</Button>
								<span class="w-6 text-center text-sm font-bold text-primary">{qty}</span>
							{/if}
							<Button
								variant={qty > 0 ? 'default' : 'secondary'}
								size="icon-sm"
								class="rounded-full {qty > 0 ? '' : 'text-primary'}"
								onclick={() => incPending(product.id)}
								aria-label="Adicionar um {product.name}"
							>
								<Plus />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else if step === 'custom'}
		<p class="mb-3 text-sm text-muted-foreground">
			Item avulso para <strong class="text-foreground">{selectedNames.join(', ')}</strong>
			{#if selectedPeople.length > 1}<span class="text-primary">(dividido entre {selectedPeople.length})</span>{/if}
		</p>

		<div class="space-y-3 rounded-2xl bg-card p-4 shadow-md shadow-black/10">
			<div class="space-y-1.5">
				<Label for="custom-name" class="text-xs text-muted-foreground">Descrição</Label>
				<Input id="custom-name" type="text" bind:value={customName} placeholder="Ex: rodízio, uber, etc" />
			</div>
			<div class="space-y-1.5">
				<Label for="custom-price" class="text-xs text-muted-foreground">Valor total (R$)</Label>
				<Input id="custom-price" type="text" inputmode="decimal" bind:value={customPrice} placeholder="0,00" />
			</div>
			<Button class="w-full" size="lg" onclick={addCustomItem} disabled={!customName.trim() || !customPrice}>
				Adicionar
			</Button>
		</div>

	{:else if step === 'done'}
		<div class="flex flex-col items-center justify-center py-16">
			<div class="animate-pop mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
				<Check class="h-10 w-10 text-success" strokeWidth={3} />
			</div>
			{#if lastAdded}
				<p class="animate-in text-center text-lg font-semibold">{lastAdded.product}</p>
				<p class="animate-in text-center text-sm text-muted-foreground" style="animation-delay: 80ms">
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

<!-- Sticky confirm bar for batched quantities on the product step -->
{#if step === 'product' && pendingCount > 0}
	<div class="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-lg px-4 pb-3">
		<Button
			class="pressable h-auto w-full rounded-2xl py-3.5 font-semibold shadow-lg shadow-primary/30"
			onclick={confirmPending}
			disabled={saving}
		>
			{saving ? 'Adicionando...' : `Adicionar ${pendingCount} ${pendingCount === 1 ? 'item' : 'itens'} · ${formatCurrency(pendingTotal)}`}
		</Button>
	</div>
{/if}

<!-- Sticky continue bar on the person step -->
{#if step === 'person' && selectedPeople.length > 0}
	<div class="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-lg px-4 pb-3">
		<Button class="pressable h-auto w-full rounded-2xl py-3.5 font-semibold shadow-lg shadow-primary/30" onclick={goToProducts}>
			Continuar{selectedPeople.length > 1 ? ` · dividir entre ${selectedPeople.length}` : ` · ${selectedNames[0]}`}
		</Button>
	</div>
{/if}
