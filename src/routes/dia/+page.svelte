<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatDate, getDayName, todayISO } from '$lib/utils';

	let selectedDate = $state(todayISO());

	// Get or find the schedule date for selected date
	const scheduleDate = $derived(
		schedule.dates.find((d) => d.date === selectedDate) ?? null
	);

	// Who's already assigned on this date
	const assigned = $derived(
		scheduleDate ? schedule.getAssignments(scheduleDate.id) : []
	);

	const assignedIds = $derived(new Set(assigned.map((a) => a.collaborator_id)));

	// All active collaborators not yet assigned
	const available = $derived(
		collaborators.active.filter((c) => !assignedIds.has(c.id))
	);

	// Grouped by role for easier selection
	const assignedCollabs = $derived(
		assigned.map((a) => {
			const c = collaborators.getById(a.collaborator_id);
			return c ? { ...c, assignmentId: a.id, dateId: a.date_id } : null;
		}).filter(Boolean) as { id: string; name: string; roles: string[]; fixed: boolean; assignmentId: string; dateId: string }[]
	);

	async function addCollab(collabId: string) {
		const sd = await schedule.getOrCreateDate(selectedDate);
		await schedule.toggleAssignment(sd.id, collabId);
		const name = collaborators.getById(collabId)?.name ?? '';
		toast.success(`${name} adicionado`);
	}

	async function removeCollab(dateId: string, collabId: string) {
		await schedule.toggleAssignment(dateId, collabId);
		const name = collaborators.getById(collabId)?.name ?? '';
		toast.info(`${name} removido`);
	}
</script>

<PageHeader title="Gerenciar Dia" />

<div class="px-4 py-4">
	<!-- Date picker -->
	<div class="mb-5 rounded-2xl bg-surface p-4 shadow-md shadow-black/10">
		<label class="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Data</label>
		<input
			type="date"
			bind:value={selectedDate}
			class="w-full rounded-xl bg-surface-2 px-4 py-3 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-accent/50"
		/>
		<p class="mt-2 text-center text-sm text-text-muted capitalize">
			{getDayName(selectedDate)} — {formatDate(selectedDate)}
		</p>
	</div>

	<!-- Currently assigned -->
	{#if assignedCollabs.length > 0}
		<div class="mb-5">
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-xs font-bold uppercase tracking-wider text-text-muted">Escalados ({assignedCollabs.length})</h2>
			</div>
			<div class="divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each assignedCollabs as person}
					<div class="flex items-center justify-between px-4 py-3">
						<div class="flex items-center gap-3">
							<span class="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-xs font-bold text-success">
								{person.name.slice(0, 2).toUpperCase()}
							</span>
							<div>
								<span class="text-sm font-medium">{person.name}</span>
								<span class="ml-1 text-[10px] text-text-muted">{person.roles.join(', ')}</span>
							</div>
						</div>
						<button
							onclick={() => removeCollab(person.dateId, person.id)}
							class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent-soft hover:text-accent active:scale-90"
							aria-label="Remover"
						>
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Available to add -->
	<div>
		<h2 class="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Adicionar</h2>
		{#if available.length === 0}
			<p class="rounded-xl bg-surface px-4 py-6 text-center text-sm text-text-muted">Todos já estão escalados nesse dia</p>
		{:else}
			<div class="grid grid-cols-2 gap-2">
				{#each available as collab}
					<button
						onclick={() => addCollab(collab.id)}
						class="pressable flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm font-medium shadow-sm shadow-black/5 transition-all active:bg-surface-2"
					>
						<span class="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold">
							{collab.name.slice(0, 2).toUpperCase()}
						</span>
						<div class="text-left">
							<div class="text-sm">{collab.name}</div>
							<div class="text-[10px] text-text-muted">{collab.roles.join(', ')}</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
