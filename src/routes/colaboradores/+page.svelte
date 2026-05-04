<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency } from '$lib/utils';

	let showAdd = $state(false);
	let newName = $state('');
	let newRole = $state<'ambos' | 'instrutor' | 'garcom' | 'bar' | 'cozinha'>('ambos');
	let newRate = $state(80);
	let newFixed = $state(false);

	async function addCollaborator() {
		if (!newName.trim()) return;
		await collaborators.add({ name: newName.trim(), role: newRole, base_rate: newRate, stars: 3, active: true, fixed: newFixed });
		toast.success(`${newName.trim()} adicionado`);
		newName = '';
		showAdd = false;
	}

	const roleLabels: Record<string, string> = { instrutor: 'Instrutor', garcom: 'Garçom', ambos: 'Ambos', bar: 'Bar', cozinha: 'Cozinha' };
</script>

<PageHeader title="Colaboradores">
	<button
		onclick={() => (showAdd = !showAdd)}
		class="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-accent/20 transition-all active:scale-95"
	>
		{showAdd ? 'Cancelar' : '+ Novo'}
	</button>
</PageHeader>

{#if showAdd}
	<form onsubmit={addCollaborator} class="animate-in border-b border-surface-2 bg-surface px-4 py-4">
		<input
			bind:value={newName}
			placeholder="Nome"
			class="mb-3 w-full rounded-xl bg-surface-2 px-4 py-2.5 text-text outline-none transition-shadow focus:ring-2 focus:ring-accent/50"
		/>
		<div class="mb-3 flex gap-2">
			{#each (['ambos', 'instrutor', 'garcom', 'bar', 'cozinha'] as const) as role}
				<button
					type="button"
					onclick={() => (newRole = role)}
					class="flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
						{newRole === role ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-surface-2 text-text-muted'}"
				>
					{roleLabels[role]}
				</button>
			{/each}
		</div>
		<div class="mb-3 flex items-center gap-4">
			<div class="flex items-center gap-2">
				<label class="text-sm text-text-muted">Valor/dia:</label>
				<input
					bind:value={newRate}
					type="number"
					class="w-24 rounded-xl bg-surface-2 px-3 py-2.5 text-text outline-none transition-shadow focus:ring-2 focus:ring-accent/50"
				/>
			</div>
			<button
				type="button"
				onclick={() => (newFixed = !newFixed)}
				class="rounded-xl px-3 py-2.5 text-sm font-medium transition-all
					{newFixed ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-surface-2 text-text-muted'}"
			>
				{newFixed ? 'Fixo' : 'Freela'}
			</button>
		</div>
		<button type="submit" class="w-full rounded-xl bg-accent py-2.5 font-medium text-white shadow-md shadow-accent/20 transition-all active:scale-[0.98]">
			Adicionar
		</button>
	</form>
{/if}

<div class="stagger divide-y divide-surface-2">
	{#each collaborators.sorted as collab}
		{@const totalConsumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid))}
		<a href="/colaboradores/{collab.id}" class="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-surface/50">
			<div class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-surface-2 to-surface-3 text-sm font-bold shadow-inner">
				{collab.name.slice(0, 2).toUpperCase()}
			</div>
			<div class="flex-1">
				<div class="font-medium">{collab.name}</div>
				<div class="flex items-center gap-2">
					<StarRating value={collab.stars} size="sm" readonly />
					<span class="text-xs text-text-muted">{roleLabels[collab.role]}</span>
					{#if collab.fixed}
						<span class="rounded bg-info/20 px-1.5 py-0.5 text-[10px] font-bold text-info">FIXO</span>
					{/if}
				</div>
			</div>
			{#if totalConsumed > 0}
				<div class="rounded-lg bg-accent-soft px-2 py-0.5 text-sm font-medium text-accent">{formatCurrency(totalConsumed)}</div>
			{/if}
			<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M9 18l6-6-6-6" />
			</svg>
		</a>
	{/each}
</div>
