<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { events, type Event } from '$lib/stores/events.svelte';
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

	// Events on this date
	const dayEvents = $derived(scheduleDate ? events.getByDateId(scheduleDate.id) : []);

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

	// Event form state
	let showEventForm = $state(false);
	let editingEventId = $state<string | null>(null);
	let evtName = $state('');
	let evtDescription = $state('');
	let evtAttendees = $state<number | null>(null);
	let evtTables = $state('');

	function resetEventForm() {
		editingEventId = null;
		evtName = '';
		evtDescription = '';
		evtAttendees = null;
		evtTables = '';
	}

	function openCreate() {
		resetEventForm();
		showEventForm = true;
	}

	function openEdit(e: Event) {
		editingEventId = e.id;
		evtName = e.name;
		evtDescription = e.description;
		evtAttendees = e.expected_attendees;
		evtTables = e.reserved_tables;
		showEventForm = true;
	}

	async function saveEvent() {
		const name = evtName.trim();
		if (!name) return;
		const sd = await schedule.getOrCreateDate(selectedDate);
		if (editingEventId) {
			await events.update(editingEventId, {
				name,
				description: evtDescription.trim(),
				expected_attendees: evtAttendees ?? null,
				reserved_tables: evtTables.trim(),
			});
			toast.success('Evento atualizado');
		} else {
			await events.add({
				date_id: sd.id,
				name,
				description: evtDescription.trim(),
				expected_attendees: evtAttendees ?? null,
				reserved_tables: evtTables.trim(),
			});
			toast.success('Evento criado');
		}
		resetEventForm();
		showEventForm = false;
	}

	async function deleteEvent(id: string) {
		await events.remove(id);
		toast.info('Evento removido');
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

	<!-- Events on this date -->
	<div class="mb-5">
		<div class="mb-2 flex items-center justify-between">
			<h2 class="text-xs font-bold uppercase tracking-wider text-text-muted">Eventos</h2>
			<button
				onclick={showEventForm ? () => { resetEventForm(); showEventForm = false; } : openCreate}
				class="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white shadow-md shadow-accent/20 active:scale-95"
			>{showEventForm ? 'Cancelar' : '+ Evento'}</button>
		</div>

		{#if showEventForm}
			<div class="mb-3 rounded-2xl bg-surface p-4 shadow-lg shadow-black/20 ring-1 ring-accent/20 space-y-3">
				<input
					bind:value={evtName}
					placeholder="Nome do evento"
					class="w-full rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
				/>
				<textarea
					bind:value={evtDescription}
					placeholder="Descrição (opcional)"
					rows="2"
					class="w-full resize-none rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
				></textarea>
				<div class="flex items-center gap-2">
					<label class="text-xs text-text-muted">Pessoas esperadas</label>
					<input
						type="number"
						bind:value={evtAttendees}
						placeholder="—"
						min="0"
						class="w-24 rounded-lg bg-surface-2 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/50"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs text-text-muted">Mesas reservadas</label>
					<input
						bind:value={evtTables}
						placeholder="Ex: M1, M2, M5 (opcional)"
						class="w-full rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
					/>
				</div>
				<button
					onclick={saveEvent}
					disabled={!evtName.trim()}
					class="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white shadow-md shadow-accent/20 active:scale-95 disabled:opacity-50"
				>{editingEventId ? 'Salvar alterações' : 'Criar evento'}</button>
			</div>
		{/if}

		{#if dayEvents.length === 0 && !showEventForm}
			<p class="rounded-xl bg-surface px-4 py-3 text-center text-sm text-text-muted">Nenhum evento</p>
		{:else if dayEvents.length > 0}
			<div class="space-y-2">
				{#each dayEvents as evt (evt.id)}
					<div class="rounded-2xl bg-surface p-4 shadow-md shadow-black/10 ring-1 ring-accent/10">
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1">
								<div class="font-semibold">{evt.name}</div>
								{#if evt.description}
									<p class="mt-0.5 text-xs text-text-muted">{evt.description}</p>
								{/if}
								<div class="mt-2 flex flex-wrap gap-2 text-[11px]">
									{#if evt.expected_attendees !== null}
										<span class="rounded-md bg-info/15 px-2 py-0.5 font-medium text-info">{evt.expected_attendees} pessoas</span>
									{/if}
									{#if evt.reserved_tables}
										<span class="rounded-md bg-warning/15 px-2 py-0.5 font-medium text-warning">Mesas: {evt.reserved_tables}</span>
									{/if}
								</div>
							</div>
							<div class="flex gap-1">
								<button onclick={() => openEdit(evt)} aria-label="Editar" class="rounded-lg p-1.5 text-text-muted active:scale-90 hover:bg-surface-2">
									<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
								</button>
								<button onclick={() => deleteEvent(evt.id)} aria-label="Remover" class="rounded-lg p-1.5 text-text-muted active:scale-90 hover:bg-accent-soft hover:text-accent">
									<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
								</button>
							</div>
						</div>
						{#if assignedCollabs.length === 0}
							<div class="mt-3 rounded-xl bg-warning/10 px-3 py-2 ring-1 ring-warning/20">
								<p class="text-xs font-medium text-warning">Ninguém escalado nesse dia ainda</p>
								<p class="mt-0.5 text-[11px] text-text-muted">Adiciona alguém abaixo pra cobrir o evento.</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Currently assigned -->
	{#if assignedCollabs.length > 0}
		<div class="mb-5">
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-xs font-bold uppercase tracking-wider text-text-muted">Escalados ({assignedCollabs.length})</h2>
			</div>
			<div class="divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each assignedCollabs as person (person.id)}
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
				{#each available as collab (collab.id)}
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
