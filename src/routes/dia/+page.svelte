<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { events, type Event } from '$lib/stores/events.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatDate, getDayName, todayISO } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import Pencil from '@lucide/svelte/icons/pencil';
	import X from '@lucide/svelte/icons/x';

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
	<div class="mb-5 rounded-2xl bg-card p-4 shadow-md shadow-black/10">
		<label for="day-date" class="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Data</label>
		<input
			id="day-date"
			type="date"
			bind:value={selectedDate}
			class="w-full rounded-xl bg-muted px-4 py-3 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-primary/50"
		/>
		<p class="mt-2 text-center text-sm text-muted-foreground capitalize">
			{getDayName(selectedDate)} — {formatDate(selectedDate)}
		</p>
	</div>

	<!-- Events on this date -->
	<div class="mb-5">
		<div class="mb-2 flex items-center justify-between">
			<h2 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Eventos</h2>
			<Button size="xs" onclick={showEventForm ? () => { resetEventForm(); showEventForm = false; } : openCreate}>
				{showEventForm ? 'Cancelar' : '+ Evento'}
			</Button>
		</div>

		{#if showEventForm}
			<div class="mb-3 rounded-2xl bg-card p-4 shadow-lg shadow-black/20 ring-1 ring-primary/20 space-y-3">
				<Input bind:value={evtName} placeholder="Nome do evento" />
				<Textarea bind:value={evtDescription} placeholder="Descrição (opcional)" rows={2} class="resize-none" />
				<div class="flex items-center gap-2">
					<Label for="evt-attendees" class="text-xs text-muted-foreground">Pessoas esperadas</Label>
					<Input id="evt-attendees" type="number" bind:value={evtAttendees} placeholder="—" min="0" class="w-24" />
				</div>
				<div class="space-y-1.5">
					<Label for="evt-tables" class="text-xs text-muted-foreground">Mesas reservadas</Label>
					<Input id="evt-tables" bind:value={evtTables} placeholder="Ex: M1, M2, M5 (opcional)" />
				</div>
				<Button class="w-full" size="lg" onclick={saveEvent} disabled={!evtName.trim()}>
					{editingEventId ? 'Salvar alterações' : 'Criar evento'}
				</Button>
			</div>
		{/if}

		{#if dayEvents.length === 0 && !showEventForm}
			<p class="rounded-xl bg-card px-4 py-3 text-center text-sm text-muted-foreground">Nenhum evento</p>
		{:else if dayEvents.length > 0}
			<div class="space-y-2">
				{#each dayEvents as evt (evt.id)}
					<div class="rounded-2xl bg-card p-4 shadow-md shadow-black/10 ring-1 ring-primary/10">
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1">
								<div class="font-semibold">{evt.name}</div>
								{#if evt.description}
									<p class="mt-0.5 text-xs text-muted-foreground">{evt.description}</p>
								{/if}
								<div class="mt-2 flex flex-wrap gap-2 text-[11px]">
									{#if evt.expected_attendees !== null}
										<Badge class="rounded-md bg-info/15 text-info">{evt.expected_attendees} pessoas</Badge>
									{/if}
									{#if evt.reserved_tables}
										<Badge class="rounded-md bg-warning/15 text-warning">Mesas: {evt.reserved_tables}</Badge>
									{/if}
								</div>
							</div>
							<div class="flex gap-1">
								<button onclick={() => openEdit(evt)} aria-label="Editar" class="rounded-lg p-1.5 text-muted-foreground active:scale-90 hover:bg-muted">
									<Pencil class="h-4 w-4" />
								</button>
								<button onclick={() => deleteEvent(evt.id)} aria-label="Remover" class="rounded-lg p-1.5 text-muted-foreground active:scale-90 hover:bg-primary/15 hover:text-primary">
									<X class="h-4 w-4" />
								</button>
							</div>
						</div>
						{#if assignedCollabs.length === 0}
							<div class="mt-3 rounded-xl bg-warning/10 px-3 py-2 ring-1 ring-warning/20">
								<p class="text-xs font-medium text-warning">Ninguém escalado nesse dia ainda</p>
								<p class="mt-0.5 text-[11px] text-muted-foreground">Adiciona alguém abaixo pra cobrir o evento.</p>
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
				<h2 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Escalados ({assignedCollabs.length})</h2>
			</div>
			<div class="divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
				{#each assignedCollabs as person (person.id)}
					<div class="flex items-center justify-between px-4 py-3">
						<div class="flex items-center gap-3">
							<span class="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-xs font-bold text-success">
								{person.name.slice(0, 2).toUpperCase()}
							</span>
							<div>
								<span class="text-sm font-medium">{person.name}</span>
								<span class="ml-1 text-[10px] text-muted-foreground">{person.roles.join(', ')}</span>
							</div>
						</div>
						<button
							onclick={() => removeCollab(person.dateId, person.id)}
							class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary active:scale-90"
							aria-label="Remover"
						>
							<X class="h-4 w-4" />
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Available to add -->
	<div>
		<h2 class="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Adicionar</h2>
		{#if available.length === 0}
			<p class="rounded-xl bg-card px-4 py-6 text-center text-sm text-muted-foreground">Todos já estão escalados nesse dia</p>
		{:else}
			<div class="grid grid-cols-2 gap-2">
				{#each available as collab (collab.id)}
					<button
						onclick={() => addCollab(collab.id)}
						class="pressable flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 text-sm font-medium shadow-sm shadow-black/5 transition-all active:bg-muted"
					>
						<span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
							{collab.name.slice(0, 2).toUpperCase()}
						</span>
						<div class="text-left">
							<div class="text-sm">{collab.name}</div>
							<div class="text-[10px] text-muted-foreground">{collab.roles.join(', ')}</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
