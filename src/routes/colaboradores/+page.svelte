<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { collaborators, ALL_ROLES, suggestedBaseRate, type Role } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let showAdd = $state(false);
	let newName = $state('');
	let newRoles = $state<Role[]>([]);
	let newRate = $state(80);
	let newFixed = $state(false);
	// Enquanto o usuário não mexer no valor manualmente, ele segue a sugestão por função.
	let rateTouched = $state(false);

	function toggleRole(role: Role) {
		if (newRoles.includes(role)) {
			newRoles = newRoles.filter((r) => r !== role);
		} else {
			newRoles = [...newRoles, role];
		}
		if (!rateTouched) newRate = suggestedBaseRate(newRoles);
	}

	function onRateInput() {
		rateTouched = true;
	}

	async function addCollaborator() {
		if (!newName.trim() || newRoles.length === 0) return;
		const rate = parseFloat(String(newRate).replace(',', '.'));
		if (!Number.isFinite(rate) || rate < 0 || rate > 1_000_000) {
			toast.error('Valor inválido');
			return;
		}
		await collaborators.add({ name: newName.trim(), roles: newRoles, base_rate: rate, stars: 3, active: true, fixed: newFixed });
		toast.success(`${newName.trim()} adicionado`);
		newName = '';
		newRoles = [];
		newRate = 80;
		rateTouched = false;
		showAdd = false;
	}
</script>

<PageHeader title="Colaboradores">
	<Button size="sm" onclick={() => (showAdd = !showAdd)}>
		{showAdd ? 'Cancelar' : '+ Novo'}
	</Button>
</PageHeader>

{#if showAdd}
	<form onsubmit={addCollaborator} class="animate-in border-b border-border bg-card px-4 py-4">
		<Input bind:value={newName} placeholder="Nome" class="mb-3" />
		<div class="mb-3 flex flex-wrap gap-2">
			{#each ALL_ROLES as { value, label }}
				<button
					type="button"
					onclick={() => toggleRole(value)}
					class="rounded-xl px-3 py-2.5 text-sm font-medium transition-all
						{newRoles.includes(value) ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
				>
					{label}
				</button>
			{/each}
		</div>
		<div class="mb-3 flex items-center gap-4">
			<div class="flex items-center gap-2">
				<Label for="new-rate" class="text-sm text-muted-foreground">Valor/dia:</Label>
				<Input id="new-rate" bind:value={newRate} oninput={onRateInput} type="number" min="0" class="w-24" />
			</div>
			<button
				type="button"
				onclick={() => (newFixed = !newFixed)}
				class="rounded-xl px-3 py-2.5 text-sm font-medium transition-all
					{newFixed ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-muted text-muted-foreground'}"
			>
				{newFixed ? 'Fixo' : 'Freela'}
			</button>
		</div>
		<Button type="submit" size="lg" class="w-full" disabled={!newName.trim() || newRoles.length === 0}>
			Adicionar
		</Button>
	</form>
{/if}

<div class="stagger divide-y divide-border">
	{#each collaborators.sorted as collab (collab.id)}
		{@const totalConsumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid))}
		<a href="/colaboradores/{collab.id}" class="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-card/50">
			<div class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-muted to-accent text-sm font-bold shadow-inner">
				{collab.name.slice(0, 2).toUpperCase()}
			</div>
			<div class="flex-1">
				<div class="font-medium">{collab.name}</div>
				<div class="flex items-center gap-2">
					<StarRating value={collab.stars} size="sm" readonly />
					<span class="text-xs text-muted-foreground">{collab.roles.map((r) => ALL_ROLES.find((ar) => ar.value === r)?.label ?? r).join(', ')}</span>
					{#if collab.fixed}
						<Badge class="bg-info/20 px-1.5 text-[10px] font-bold text-info">FIXO</Badge>
					{/if}
				</div>
			</div>
			{#if totalConsumed > 0}
				<div class="rounded-lg bg-primary/15 px-2 py-0.5 text-sm font-medium text-primary">{formatCurrency(totalConsumed)}</div>
			{/if}
			<ChevronRight class="h-4 w-4 text-muted-foreground" />
		</a>
	{/each}
</div>
