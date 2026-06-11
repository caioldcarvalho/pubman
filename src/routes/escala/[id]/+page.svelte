<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatDate, getDayName } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import Copy from '@lucide/svelte/icons/copy';

	const period = $derived(schedule.periods.find((p) => p.id === page.params.id));
	const dates = $derived(period ? schedule.getDatesByPeriod(period.id) : []);

	// availability é carregada sob demanda (não vem no boot) — só esta tela a usa.
	$effect(() => {
		if (period) schedule.loadAvailabilityForPeriod(period.id);
	});
	const assignmentCounts = $derived(period ? schedule.getAssignmentCountByCollaborator(period.id) : new Map());
	const dayCounts = $derived(period ? schedule.getAssignmentCountsByDay(period.id) : new Map());

	let tab = $state<'availability' | 'schedule'>('availability');
	let availView = $state<'dia' | 'colab'>('dia');
	let area = $state<'salao' | 'cozinha'>('salao');
	let showDeleteConfirm = $state(false);
	let editing = $state(false);
	let editStart = $state('');
	let editEnd = $state('');

	const dayLabels: Record<number, string> = { 5: 'Sex', 6: 'Sáb' };

	// Staff filtered by area
	const areaFreelancers = $derived(
		area === 'salao' ? collaborators.salaoFreelancers : collaborators.cozinhaFreelancers
	);

	const hasCozinha = $derived(collaborators.cozinhaStaff.length > 0);

	async function toggleAvail(dateId: string, collabId: string, current: boolean) {
		await schedule.setAvailability(dateId, collabId, !current);
	}

	async function toggleAssign(dateId: string, collabId: string) {
		const wasAssigned = schedule.isAssigned(dateId, collabId);
		await schedule.toggleAssignment(dateId, collabId);
		const name = collaborators.getById(collabId)?.name ?? '';
		if (!wasAssigned) {
			toast.success(`${name} escalado`);
		}
	}

	function startEdit() {
		if (!period) return;
		editStart = period.start_date;
		editEnd = period.end_date;
		editing = true;
	}

	async function saveEdit() {
		if (!period || !editStart || !editEnd) return;
		await schedule.updatePeriod(period.id, editStart, editEnd);
		toast.success('Escala atualizada');
		editing = false;
	}

	async function deletePeriod() {
		if (!period) return;
		await schedule.deletePeriod(period.id);
		toast.info('Escala excluída');
		goto('/escala');
	}

	function exportSchedule() {
		if (!dates.length) return;

		const lines: string[] = [];
		let lastDate = '';

		for (const d of dates) {
			const assigned = schedule.getAssignments(d.id);
			const names = assigned
				.map((a) => collaborators.getById(a.collaborator_id)?.name)
				.filter(Boolean);

			// Add blank line if there's a gap of more than 2 days from last date
			if (lastDate) {
				const prev = new Date(lastDate + 'T12:00:00');
				const curr = new Date(d.date + 'T12:00:00');
				const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
				if (diffDays > 2) lines.push('');
			}

			const dateStr = formatDate(d.date);
			lines.push(names.length > 0 ? `${dateStr} - ${names.join(', ')}` : `${dateStr} - (vazio)`);
			lastDate = d.date;
		}

		navigator.clipboard.writeText(lines.join('\n'));
		toast.success('Escala copiada!');
	}
</script>

{#if period}
	<PageHeader title="{formatDate(period.start_date)} - {formatDate(period.end_date)}" backHref="/escala">
		<div class="flex gap-2">
			<Button variant="secondary" size="icon-sm" onclick={exportSchedule} title="Copiar escala" aria-label="Copiar escala">
				<Copy />
			</Button>
			<Button variant="secondary" size="sm" onclick={startEdit}>
				Editar
			</Button>
			<Button variant="secondary" size="sm" class="bg-primary/15 text-primary" onclick={() => (showDeleteConfirm = true)}>
				Excluir
			</Button>
		</div>
	</PageHeader>

	<!-- Delete confirmation -->
	{#if showDeleteConfirm}
		<div class="mx-4 mb-4 animate-in rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/20">
			<p class="mb-3 text-sm font-medium">Excluir esta escala? Todas as disponibilidades e escalações serão perdidas.</p>
			<div class="flex gap-2">
				<Button class="flex-1" onclick={deletePeriod}>Confirmar</Button>
				<Button variant="secondary" class="flex-1" onclick={() => (showDeleteConfirm = false)}>Cancelar</Button>
			</div>
		</div>
	{/if}

	<!-- Edit period dates -->
	{#if editing}
		<div class="mx-4 mb-4 animate-in rounded-2xl bg-card p-4 shadow-lg shadow-black/20 ring-1 ring-primary/20">
			<p class="mb-3 text-sm font-medium">Editar período <span class="text-xs text-muted-foreground">(disponibilidades e escalações serão resetadas)</span></p>
			<div class="mb-3 space-y-1.5">
				<Label for="edit-start" class="text-xs text-muted-foreground">Início</Label>
				<Input id="edit-start" type="date" bind:value={editStart} />
			</div>
			<div class="mb-3 space-y-1.5">
				<Label for="edit-end" class="text-xs text-muted-foreground">Fim</Label>
				<Input id="edit-end" type="date" bind:value={editEnd} />
			</div>
			<div class="flex gap-2">
				<Button class="flex-1" onclick={saveEdit} disabled={!editStart || !editEnd}>Salvar</Button>
				<Button variant="secondary" class="flex-1" onclick={() => (editing = false)}>Cancelar</Button>
			</div>
		</div>
	{/if}

	<!-- Area toggle (only if there's cozinha staff) -->
	{#if hasCozinha}
		<div class="flex gap-2 px-4 pt-3">
			<button
				onclick={() => (area = 'salao')}
				class="rounded-xl px-3 py-1.5 text-xs font-medium transition-all
					{area === 'salao' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
			>
				Salão
			</button>
			<button
				onclick={() => (area = 'cozinha')}
				class="rounded-xl px-3 py-1.5 text-xs font-medium transition-all
					{area === 'cozinha' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
			>
				Cozinha
			</button>
		</div>
	{/if}

	<div class="flex border-b border-border">
		<button
			onclick={() => (tab = 'availability')}
			class="flex-1 py-3 text-center text-sm font-medium transition-all
				{tab === 'availability' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}"
		>
			Disponibilidade
		</button>
		<button
			onclick={() => (tab = 'schedule')}
			class="flex-1 py-3 text-center text-sm font-medium transition-all
				{tab === 'schedule' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}"
		>
			Montar Escala
		</button>
	</div>

	{#if tab === 'availability'}
		<div class="px-4 py-4">
			<!-- View mode toggle -->
			<div class="mb-4 flex gap-2">
				<button
					onclick={() => (availView = 'dia')}
					class="rounded-xl px-3 py-1.5 text-xs font-medium transition-all
						{availView === 'dia' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
				>
					Por dia
				</button>
				<button
					onclick={() => (availView = 'colab')}
					class="rounded-xl px-3 py-1.5 text-xs font-medium transition-all
						{availView === 'colab' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
				>
					Por colaborador
				</button>
			</div>

			{#if areaFreelancers.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">Nenhum colaborador de {area === 'salao' ? 'salão' : 'cozinha'} cadastrado.</p>
			{:else if availView === 'dia'}
				<p class="mb-4 text-sm text-muted-foreground">Para cada dia, toque nos colaboradores disponíveis.</p>
				<div class="stagger space-y-5">
					{#each dates as schedDate (schedDate.id)}
						{@const dayAvail = schedule.getAvailability(schedDate.id)}
						{@const availCount = areaFreelancers.filter((c) => dayAvail.some((a) => a.collaborator_id === c.id && a.available)).length}
						<div>
							<div class="mb-2 flex items-center gap-2">
								<span class="rounded-lg bg-muted px-2 py-1 text-xs font-bold {schedDate.day_of_week === 6 ? 'bg-primary/20 text-primary' : ''}">
									{dayLabels[schedDate.day_of_week] ?? getDayName(schedDate.date)}
								</span>
								<span class="text-sm font-semibold">{formatDate(schedDate.date)}</span>
								<Badge class="bg-success/15 font-bold text-success">
									{availCount} disp.
								</Badge>
							</div>
							<div class="grid grid-cols-2 gap-1.5">
								{#each areaFreelancers as collab (collab.id)}
									{@const avail = dayAvail.find((a) => a.collaborator_id === collab.id)}
									{@const isAvailable = avail?.available ?? false}
									<button
										onclick={() => toggleAvail(schedDate.id, collab.id, isAvailable)}
										class="pressable rounded-xl px-3 py-2 text-left text-sm font-medium transition-all
											{isAvailable ? 'bg-success/15 text-success ring-1 ring-success/30' : 'bg-card text-muted-foreground ring-1 ring-border'}"
									>
										{collab.name}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="mb-4 text-sm text-muted-foreground">Toque nas datas para alternar disponibilidade.</p>
				<div class="stagger space-y-5">
					{#each areaFreelancers as collab (collab.id)}
						<div class="rounded-2xl bg-card p-4 shadow-md shadow-black/10">
							<div class="mb-3 text-sm font-semibold">{collab.name}</div>
							<div class="flex flex-wrap gap-1.5">
								{#each dates as schedDate (schedDate.id)}
									{@const avail = schedule.getAvailability(schedDate.id).find((a) => a.collaborator_id === collab.id)}
									{@const isAvailable = avail?.available ?? false}
									<button
										onclick={() => toggleAvail(schedDate.id, collab.id, isAvailable)}
										class="pressable rounded-lg px-3 py-2 text-xs font-medium transition-all
											{isAvailable ? 'bg-success/15 text-success ring-1 ring-success/30' : 'bg-muted text-muted-foreground'}
											{schedDate.day_of_week === 6 ? 'ring-1 ring-primary/20' : ''}"
									>
										<span class="block text-[10px] uppercase opacity-70">{dayLabels[schedDate.day_of_week] ?? getDayName(schedDate.date)}</span>
										<span>{formatDate(schedDate.date)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	{:else}
		<div class="px-4 py-4">
			<!-- Assignment counts -->
			{#if areaFreelancers.length > 0}
				<div class="animate-in mb-5 rounded-2xl bg-card p-4 shadow-md shadow-black/10">
					<div class="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						<span>Dias convocados</span>
						<span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-muted-foreground"></span> sex</span>
						<span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-primary"></span> sáb</span>
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#each areaFreelancers as collab (collab.id)}
							{@const dc = dayCounts.get(collab.id) ?? { fri: 0, sat: 0, other: 0 }}
							{@const total = dc.fri + dc.sat + dc.other}
							<div class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
								{total > 0 ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'bg-muted text-muted-foreground'}">
								<span>{collab.name}</span>
								<span class="font-bold">{dc.fri}</span>
								<span class="font-bold text-primary">{dc.sat}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="stagger space-y-5">
				{#each dates as schedDate (schedDate.id)}
					{@const available = schedule.getAvailableCollaborators(schedDate.id)}
					{@const assigned = schedule.getAssignments(schedDate.id)}
					{@const isFull = assigned.length >= schedDate.required_count}
					<div>
						<div class="mb-2 flex items-center gap-2">
							<span class="rounded-lg bg-muted px-2 py-1 text-xs font-bold {schedDate.day_of_week === 6 ? 'bg-primary/20 text-primary' : ''}">
								{dayLabels[schedDate.day_of_week] ?? getDayName(schedDate.date)}
							</span>
							<span class="text-sm font-semibold">{formatDate(schedDate.date)}</span>
							<Badge class="font-bold {isFull ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}">
								{assigned.length}/{schedDate.required_count}
							</Badge>
						</div>
						{#if available.filter((a) => areaFreelancers.some((c) => c.id === a.collaborator_id)).length === 0}
							<p class="rounded-xl bg-card px-4 py-3 text-center text-xs text-muted-foreground">Ninguém disponível</p>
						{:else}
							<div class="grid grid-cols-2 gap-1.5">
								{#each areaFreelancers as collab (collab.id)}
									{@const isAvail = available.some((a) => a.collaborator_id === collab.id)}
									{@const isAssigned = schedule.isAssigned(schedDate.id, collab.id)}
									{@const dc = dayCounts.get(collab.id) ?? { fri: 0, sat: 0, other: 0 }}
									{#if isAvail}
										<button
											onclick={() => toggleAssign(schedDate.id, collab.id)}
											class="pressable flex flex-col items-start rounded-xl px-3 py-2 text-left transition-all
												{isAssigned ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'bg-card text-foreground ring-1 ring-border'}"
										>
											<span class="text-sm font-medium">{collab.name}</span>
											<div class="flex items-center gap-2 text-[10px] {isAssigned ? 'text-primary-foreground/70' : 'text-muted-foreground'}">
												<span title="Estrelas">★{collab.stars}</span>
												<span title="Sextas">sex·{dc.fri}</span>
												<span class="{isAssigned ? '' : 'text-primary'}" title="Sábados">sáb·{dc.sat}</span>
											</div>
										</button>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
{:else}
	<PageHeader title="Não encontrada" backHref="/escala" />
	<p class="py-8 text-center text-muted-foreground">Escala não encontrada.</p>
{/if}
