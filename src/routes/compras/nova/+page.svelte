<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { todayISO, formatCurrency } from '$lib/utils';

	let amount = $state(0);
	let date = $state(todayISO());
	let notes = $state('');

	async function save() {
		if (amount <= 0) return;
		await purchases.add({ amount, date, notes: notes.trim() });
		toast.success(`Compra de ${formatCurrency(amount)} registrada`);
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

		<div>
			<label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-muted">Observação (opcional)</label>
			<textarea
				bind:value={notes}
				rows="3"
				class="w-full resize-none rounded-2xl bg-surface px-4 py-3 text-text outline-none shadow-md shadow-black/10 transition-shadow focus:ring-2 focus:ring-accent/50"
				placeholder="O que foi comprado..."
			></textarea>
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
