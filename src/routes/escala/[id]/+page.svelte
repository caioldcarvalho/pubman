<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatDate, getDayName } from '$lib/utils';

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
			<button onclick={exportSchedule} class="rounded-xl bg-surface-2 px-3 py-1.5 text-sm font-medium text-text-muted transition-all active:scale-95" title="Copiar escala">
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-2M16 3h5v5M10 14L20.2 3.8" /></svg>
			</button>
			<button onclick={startEdit} class="rounded-xl bg-surface-2 px-3 py-1.5 text-sm font-medium text-text-muted transition-all active:scale-95">
				Editar
			</button>
			<button onclick={() => (showDeleteConfirm = true)} class="rounded-xl bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent transition-all active:scale-95">
				Excluir
			</button>
		</div>
	</PageHeader>

	<!-- Delete confirmation -->
	{#if showDeleteConfirm}
		<div class="mx-4 mb-4 animate-in rounded-2xl bg-accent/10 p-4 ring-1 ring-accent/20">
			<p class="mb-3 text-sm font-medium">Excluir esta escala? Todas as disponibilidades e escalações serão perdidas.</p>
			<div class="flex gap-2">
				<button onclick={deletePeriod} class="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white">Confirmar</button>
				<button onclick={() => (showDeleteConfirm = false)} class="flex-1 rounded-xl bg-surface-2 py-2.5 text-sm font-medium text-text-muted">Cancelar</button>
			</div>
		</div>
	{/if}

	<!-- Edit period dates -->
	{#if editing}
		<div class="mx-4 mb-4 animate-in rounded-2xl bg-surface p-4 shadow-lg shadow-black/20 ring-1 ring-accent/20">
			<p class="mb-3 text-sm font-medium">Editar período <span class="text-xs text-text-muted">(disponibilidades e escalações serão resetadas)</span></p>
			<label class="mb-1 block text-xs text-text-muted">Início</label>
			<input bind:value={editStart} type="date" class="mb-3 w-full rounded-xl bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-accent/50" />
			<label class="mb-1 block text-xs text-text-muted">Fim</label>
			<input bind:value={editEnd} type="date" class="mb-3 w-full rounded-xl bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-accent/50" />
			<div class="flex gap-2">
				<button onclick={saveEdit} disabled={!editStart || !editEnd} class="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50">Salvar</button>
				<button onclick={() => (editing = false)} class="flex-1 rounded-xl bg-surface-2 py-2.5 text-sm font-medium text-text-muted">Cancelar</button>
			</div>
		</div>
	{/if}

	<!-- Area toggle (only if there's cozinha staff) -->
	{#if hasCozinha}
		<div class="flex gap-2 px-4 pt-3">
			<button
				onclick={() => (area = 'salao')}
				class="rounded-xl px-3 py-1.5 text-xs font-medium transition-all
					{area === 'salao' ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-surface-2 text-text-muted'}"
			>
				Salão
			</button>
			<button
				onclick={() => (area = 'cozinha')}
				class="rounded-xl px-3 py-1.5 text-xs font-medium transition-all
					{area === 'cozinha' ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-surface-2 text-text-muted'}"
			>
				Cozinha
			</button>
		</div>
	{/if}

	<div class="flex border-b border-surface-2">
		<button
			onclick={() => (tab = 'availability')}
			class="flex-1 py-3 text-center text-sm font-medium transition-all
				{tab === 'availability' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}"
		>
			Disponibilidade
		</button>
		<button
			onclick={() => (tab = 'schedule')}
			class="flex-1 py-3 text-center text-sm font-medium transition-all
				{tab === 'schedule' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}"
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
						{availView === 'dia' ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-surface-2 text-text-muted'}"
				>
					Por dia
				</button>
				<button
					onclick={() => (availView = 'colab')}
					class="rounded-xl px-3 py-1.5 text-xs font-medium transition-all
						{availView === 'colab' ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-surface-2 text-text-muted'}"
				>
					Por colaborador
				</button>
			</div>

			{#if areaFreelancers.length === 0}
				<p class="py-8 text-center text-sm text-text-muted">Nenhum colaborador de {area === 'salao' ? 'salão' : 'cozinha'} cadastrado.</p>
			{:else if availView === 'dia'}
				<p class="mb-4 text-sm text-text-muted">Para cada dia, toque nos colaboradores disponíveis.</p>
				<div class="stagger space-y-5">
					{#each dates as schedDate (schedDate.id)}
						{@const dayAvail = schedule.getAvailability(schedDate.id)}
						{@const availCount = areaFreelancers.filter((c) => dayAvail.some((a) => a.collaborator_id === c.id && a.available)).length}
						<div>
							<div class="mb-2 flex items-center gap-2">
								<span class="rounded-lg bg-surface-2 px-2 py-1 text-xs font-bold {schedDate.day_of_week === 6 ? 'bg-accent/20 text-accent' : ''}">
									{dayLabels[schedDate.day_of_week] ?? getDayName(schedDate.date)}
								</span>
								<span class="text-sm font-semibold">{formatDate(schedDate.date)}</span>
								<span class="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
									{availCount} disp.
								</span>
							</div>
							<div class="grid grid-cols-2 gap-1.5">
								{#each areaFreelancers as collab (collab.id)}
									{@const avail = dayAvail.find((a) => a.collaborator_id === collab.id)}
									{@const isAvailable = avail?.available ?? false}
									<button
										onclick={() => toggleAvail(schedDate.id, collab.id, isAvailable)}
										class="pressable rounded-xl px-3 py-2 text-left text-sm font-medium transition-all
											{isAvailable ? 'bg-success/15 text-success ring-1 ring-success/30' : 'bg-surface text-text-muted ring-1 ring-surface-2'}"
									>
										{collab.name}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="mb-4 text-sm text-text-muted">Toque nas datas para alternar disponibilidade.</p>
				<div class="stagger space-y-5">
					{#each areaFreelancers as collab (collab.id)}
						<div class="rounded-2xl bg-surface p-4 shadow-md shadow-black/10">
							<div class="mb-3 text-sm font-semibold">{collab.name}</div>
							<div class="flex flex-wrap gap-1.5">
								{#each dates as schedDate (schedDate.id)}
									{@const avail = schedule.getAvailability(schedDate.id).find((a) => a.collaborator_id === collab.id)}
									{@const isAvailable = avail?.available ?? false}
									<button
										onclick={() => toggleAvail(schedDate.id, collab.id, isAvailable)}
										class="pressable rounded-lg px-3 py-2 text-xs font-medium transition-all
											{isAvailable ? 'bg-success/15 text-success ring-1 ring-success/30' : 'bg-surface-2 text-text-muted'}
											{schedDate.day_of_week === 6 ? 'ring-1 ring-accent/20' : ''}"
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
				<div class="animate-in mb-5 rounded-2xl bg-surface p-4 shadow-md shadow-black/10">
					<div class="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">
						<span>Dias convocados</span>
						<span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-text-muted"></span> sex</span>
						<span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-accent"></span> sáb</span>
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#each areaFreelancers as collab (collab.id)}
							{@const dc = dayCounts.get(collab.id) ?? { fri: 0, sat: 0, other: 0 }}
							{@const total = dc.fri + dc.sat + dc.other}
							<div class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
								{total > 0 ? 'bg-accent/15 text-accent ring-1 ring-accent/30' : 'bg-surface-2 text-text-muted'}">
								<span>{collab.name}</span>
								<span class="font-bold">{dc.fri}</span>
								<span class="font-bold text-accent">{dc.sat}</span>
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
							<span class="rounded-lg bg-surface-2 px-2 py-1 text-xs font-bold {schedDate.day_of_week === 6 ? 'bg-accent/20 text-accent' : ''}">
								{dayLabels[schedDate.day_of_week] ?? getDayName(schedDate.date)}
							</span>
							<span class="text-sm font-semibold">{formatDate(schedDate.date)}</span>
							<span class="rounded-full px-2 py-0.5 text-xs font-bold {isFull ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}">
								{assigned.length}/{schedDate.required_count}
							</span>
						</div>
						{#if available.filter((a) => areaFreelancers.some((c) => c.id === a.collaborator_id)).length === 0}
							<p class="rounded-xl bg-surface px-4 py-3 text-center text-xs text-text-muted">Ninguém disponível</p>
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
												{isAssigned ? 'bg-accent text-white shadow-md shadow-accent/30' : 'bg-surface text-text ring-1 ring-surface-2'}"
										>
											<span class="text-sm font-medium">{collab.name}</span>
											<div class="flex items-center gap-2 text-[10px] {isAssigned ? 'text-white/70' : 'text-text-muted'}">
												<span title="Estrelas">★{collab.stars}</span>
												<span title="Sextas">sex·{dc.fri}</span>
												<span class="{isAssigned ? '' : 'text-accent'}" title="Sábados">sáb·{dc.sat}</span>
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
	<p class="py-8 text-center text-text-muted">Escala não encontrada.</p>
{/if}
