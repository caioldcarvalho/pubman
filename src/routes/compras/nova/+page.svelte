<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { tasks } from '$lib/stores/tasks.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { todayISO, formatCurrency } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Check from '@lucide/svelte/icons/check';

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
		<div class="space-y-1.5">
			<Label for="amount" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor (R$)</Label>
			<Input
				id="amount"
				bind:value={amount}
				type="number"
				step="0.01"
				min="0"
				class="text-lg font-semibold"
				placeholder="0.00"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="date" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data</Label>
			<input
				id="date"
				bind:value={date}
				type="date"
				class="w-full rounded-2xl bg-card px-4 py-3 text-foreground outline-none shadow-md shadow-black/10 transition-shadow focus:ring-2 focus:ring-primary/50"
			/>
		</div>

		{#if tasks.shopping.length > 0}
			<div class="space-y-1.5">
				<p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Da lista de compras</p>
				<ul class="space-y-1 rounded-2xl bg-card p-2 shadow-md shadow-black/10">
					{#each tasks.shopping as item (item.id)}
						{@const checked = pickedIds.includes(item.id)}
						<li>
							<button
								type="button"
								onclick={() => toggle(item.id)}
								class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors {checked ? 'bg-primary/15' : 'hover:bg-muted'}"
							>
								<span
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors {checked ? 'bg-primary text-primary-foreground' : 'ring-1 ring-border'}"
								>
									{#if checked}
										<Check class="h-3.5 w-3.5" strokeWidth={3} />
									{/if}
								</span>
								<span class="flex-1 {checked ? 'text-primary' : 'text-foreground'}">{item.description}</span>
							</button>
						</li>
					{/each}
				</ul>
				{#if pickedIds.length > 0}
					<p class="px-1 text-[11px] text-muted-foreground">{pickedIds.length} item{pickedIds.length === 1 ? '' : 's'} ser{pickedIds.length === 1 ? 'á' : 'ão'} removido{pickedIds.length === 1 ? '' : 's'} da lista ao salvar</p>
				{/if}
			</div>
		{/if}

		<div class="space-y-1.5">
			<Label for="notes" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observação (opcional)</Label>
			<Textarea
				id="notes"
				bind:value={notes}
				rows={3}
				class="resize-none"
				placeholder={pickedIds.length > 0 ? 'Detalhes adicionais...' : 'O que foi comprado...'}
			/>
			{#if pickedIds.length > 0 && finalNotes}
				<p class="px-1 text-[11px] text-muted-foreground">Será salvo como: <span class="text-foreground">{finalNotes}</span></p>
			{/if}
		</div>

		<Button
			size="lg"
			class="pressable h-auto w-full rounded-2xl py-3.5 font-semibold shadow-lg shadow-primary/30"
			onclick={save}
			disabled={amount <= 0}
		>
			Salvar Compra
		</Button>
	</div>
</div>
