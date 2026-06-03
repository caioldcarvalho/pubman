<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { tasks } from '$lib/stores/tasks.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { todayISO, formatCurrency } from '$lib/utils';

	let amount = $state(0);
	let date = $state(todayISO());
	let notes = $state('');
	let pickedIds = $state<string[]>([]);

	const pickedDescriptions = $derived(
		tasks.shopping.filter((t) => pickedIds.includes(t.id)).map((t) => t.description)
	);

	const finalNotes = $derived.by(() => {
		const parts = [...pickedDescriptions];
		const trimmed = notes.trim();
		if (trimmed) parts.push(trimmed);
		return parts.join(', ');
	});

	function toggle(id: string) {
		if (pickedIds.includes(id)) pickedIds = pickedIds.filter((x) => x !== id);
		else pickedIds = [...pickedIds, id];
	}

	async function save() {
		const v = parseFloat(String(amount).replace(',', '.'));
		if (!Number.isFinite(v) || v <= 0 || v > 1_000_000) {
			toast.error('Valor inválido');
			return;
		}
		await purchases.add({ amount: v, date, notes: finalNotes });
		if (pickedIds.length > 0) await tasks.removeMany(pickedIds);
		toast.success(`Compra de ${formatCurrency(v)} registrada`);
		goto('/compras');
	}
</script>

<PageHeader title="Nova Compra" backHref="/compras" />

<div class="px-4 py-6">
	<div class="stagger space-y-5">
		<div>
			<label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-muted">Valor (R$)</label>
			<input
				bind:value={amount}
				type="number"
				step="0.01"
				min="0"
				class="w-full rounded-2xl bg-surface px-4 py-3 text-lg font-semibold text-text outline-none shadow-md shadow-black/10 transition-shadow focus:ring-2 focus:ring-accent/50"
				placeholder="0.00"
			/>
		</div>

		<div>
			<label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-muted">Data</label>
			<input
				bind:value={date}
				type="date"
				class="w-full rounded-2xl bg-surface px-4 py-3 text-text outline-none shadow-md shadow-black/10 transition-shadow focus:ring-2 focus:ring-accent/50"
			/>
		</div>

		{#if tasks.shopping.length > 0}
			<div>
				<label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-muted">Da lista de compras</label>
				<ul class="space-y-1 rounded-2xl bg-surface p-2 shadow-md shadow-black/10">
					{#each tasks.shopping as item (item.id)}
						{@const checked = pickedIds.includes(item.id)}
						<li>
							<button
								type="button"
								onclick={() => toggle(item.id)}
								class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors {checked ? 'bg-accent/15' : 'hover:bg-surface-2'}"
							>
								<span
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors {checked ? 'bg-accent text-white' : 'ring-1 ring-white/15'}"
								>
									{#if checked}
										<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
											<path d="M5 12l5 5L20 7" />
										</svg>
									{/if}
								</span>
								<span class="flex-1 {checked ? 'text-accent' : 'text-text'}">{item.description}</span>
							</button>
						</li>
					{/each}
				</ul>
				{#if pickedIds.length > 0}
					<p class="mt-1.5 px-1 text-[11px] text-text-muted">{pickedIds.length} item{pickedIds.length === 1 ? '' : 's'} ser{pickedIds.length === 1 ? 'á' : 'ão'} removido{pickedIds.length === 1 ? '' : 's'} da lista ao salvar</p>
				{/if}
			</div>
		{/if}

		<div>
			<label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-muted">Observação (opcional)</label>
			<textarea
				bind:value={notes}
				rows="3"
				class="w-full resize-none rounded-2xl bg-surface px-4 py-3 text-text outline-none shadow-md shadow-black/10 transition-shadow focus:ring-2 focus:ring-accent/50"
				placeholder={pickedIds.length > 0 ? 'Detalhes adicionais...' : 'O que foi comprado...'}
			></textarea>
			{#if pickedIds.length > 0 && finalNotes}
				<p class="mt-1.5 px-1 text-[11px] text-text-muted">Será salvo como: <span class="text-text">{finalNotes}</span></p>
			{/if}
		</div>

		<button
			onclick={save}
			disabled={amount <= 0}
			class="pressable w-full rounded-2xl bg-accent py-3.5 font-semibold text-white shadow-lg shadow-accent/20 transition-all disabled:opacity-40 disabled:shadow-none"
		>
			Salvar Compra
		</button>
	</div>
</div>
