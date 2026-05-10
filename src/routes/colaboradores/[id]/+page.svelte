<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { collaborators, ALL_ROLES, type Role } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate, getDayName, todayISO } from '$lib/utils';

	const collab = $derived(collaborators.getById(page.params.id));
	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);
	const DISCOUNT = 0.20;
	const total = $derived(
		entries.reduce((sum, e) => {
			const price = e.custom_price ?? (products.getById(e.product_id!)?.price ?? 0);
			return sum + price * e.quantity * (1 - DISCOUNT);
		}, 0)
	);

	let editing = $state(false);
	let editRate = $state(0);

	// Calendar: all assignments for this collaborator
	const FULL_SHIFT_HOURS = 6;
	const allAssignments = $derived(
		collab
			? schedule.assignments
					.filter((a) => a.collaborator_id === collab.id)
					.map((a) => {
						const sd = schedule.getDateById(a.date_id);
						return { ...a, date: sd?.date ?? '' };
					})
					.filter((a) => a.date)
					.sort((a, b) => b.date.localeCompare(a.date))
			: []
	);

	function getHoursWorked(checkIn: string | null, checkOut: string | null): number | null {
		if (!checkIn || !checkOut) return null;
		const [h1, m1] = checkIn.split(':').map(Number);
		const [h2, m2] = checkOut.split(':').map(Number);
		let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
		if (diff < 0) diff += 24 * 60;
		return diff / 60;
	}

	function getEffectiveRate(a: { rate_override: number | null; check_in: string | null; check_out: string | null }, baseRate: number): number {
		const rate = a.rate_override ?? baseRate;
		const hours = getHoursWorked(a.check_in, a.check_out);
		if (hours === null) return rate;
		return rate * (hours / FULL_SHIFT_HOURS);
	}

	// Calendar month navigation
	let calendarMonth = $state(new Date());
	const calendarDays = $derived(() => {
		const year = calendarMonth.getFullYear();
		const month = calendarMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startPad = firstDay.getDay(); // 0=Sun
		const days: { date: string; inMonth: boolean; worked: boolean }[] = [];

		const workedDates = new Set(allAssignments.map((a) => a.date));

		// Pad start
		for (let i = 0; i < startPad; i++) {
			const d = new Date(year, month, 1 - startPad + i);
			days.push({ date: d.toISOString().split('T')[0], inMonth: false, worked: workedDates.has(d.toISOString().split('T')[0]) });
		}
		// Days in month
		for (let d = 1; d <= lastDay.getDate(); d++) {
			const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({ date: dateStr, inMonth: true, worked: workedDates.has(dateStr) });
		}
		return days;
	});

	function prevMonth() { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1); }
	function nextMonth() { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1); }

	// Edit assignment inline
	let editingAssignment = $state<string | null>(null);
	let editAssignRate = $state(0);
	let editAssignIn = $state('');
	let editAssignOut = $state('');

	function startEditAssignment(a: typeof allAssignments[0]) {
		editingAssignment = a.id;
		editAssignRate = a.rate_override ?? collab!.base_rate;
		editAssignIn = a.check_in ?? '';
		editAssignOut = a.check_out ?? '';
	}

	async function saveAssignment() {
		if (!editingAssignment || !collab) return;
		const rateOverride = editAssignRate === collab.base_rate ? null : editAssignRate;
		await schedule.updateAssignmentRate(editingAssignment, rateOverride);
		await schedule.updateAssignmentTimes(editingAssignment, editAssignIn || null, editAssignOut || null);
		toast.success('Atualizado');
		editingAssignment = null;
	}

	async function removeDay(assignmentId: string, dateId: string) {
		if (!collab) return;
		await schedule.toggleAssignment(dateId, collab.id);
		toast.info('Dia removido');
	}

	// Add retroactive day
	let showAddDay = $state(false);
	let addDayDate = $state(todayISO());
	let addDayRate = $state(0);
	let addDayIn = $state('');
	let addDayOut = $state('');

	function openAddDay() {
		if (!collab) return;
		addDayDate = todayISO();
		addDayRate = collab.base_rate;
		addDayIn = '';
		addDayOut = '';
		showAddDay = true;
	}

	async function confirmAddDay() {
		if (!collab) return;
		try {
			const rateOverride = addDayRate === collab.base_rate ? null : addDayRate;
			await schedule.addRetroactiveAssignment(
				collab.id,
				addDayDate,
				rateOverride,
				addDayIn || null,
				addDayOut || null,
			);
			toast.success(`Dia ${addDayDate} adicionado`);
			showAddDay = false;
		} catch (e: any) {
			toast.error(e.message ?? 'Erro ao adicionar dia');
		}
	}

	function startEdit() {
		if (!collab) return;
		editRate = collab.base_rate;
		editing = true;
	}

	async function saveRate() {
		if (!collab) return;
		await collaborators.update(collab.id, { base_rate: editRate });
		toast.success(`Valor atualizado para ${formatCurrency(editRate)}`);
		editing = false;
	}

	async function handleStars(v: number) {
		if (!collab) return;
		await collaborators.setStars(collab.id, v);
	}

	async function toggleRole(role: Role) {
		if (!collab) return;
		const has = collab.roles.includes(role);
		const newRoles = has ? collab.roles.filter((r) => r !== role) : [...collab.roles, role];
		if (newRoles.length === 0) return;
		await collaborators.update(collab.id, { roles: newRoles });
		toast.success(`Funções atualizadas`);
	}
</script>

{#if collab}
	<PageHeader title={collab.name} backHref="/colaboradores" />

	<div class="px-4 py-4">
		<div class="animate-in mb-4 rounded-2xl bg-surface p-5 shadow-lg shadow-black/20">
			<div class="mb-4 flex items-center justify-between">
				<button
					onclick={async () => { await collaborators.update(collab.id, { fixed: !collab.fixed }); toast.success(collab.fixed ? 'Agora é freela' : 'Agora é fixo'); }}
					class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all
						{collab.fixed ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-surface-2 text-text-muted'}"
				>
					{collab.fixed ? 'FIXO' : 'FREELA'}
				</button>
				<StarRating
					value={collab.stars}
					size="lg"
					onchange={handleStars}
				/>
			</div>

			<!-- Role tags -->
			<div class="mb-4">
				<div class="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Funções</div>
				<div class="flex flex-wrap gap-1.5">
					{#each ALL_ROLES as { value, label }}
						{@const active = collab.roles.includes(value)}
						<button
							onclick={() => toggleRole(value)}
							class="rounded-lg px-3 py-1.5 text-xs font-medium transition-all
								{active ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-surface-2 text-text-muted'}"
						>
							{label}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-sm text-text-muted">Valor/dia</span>
				{#if editing}
					<div class="flex items-center gap-2">
						<input
							bind:value={editRate}
							type="number"
							class="w-24 rounded-xl bg-surface-2 px-3 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-accent/50"
						/>
						<button onclick={saveRate} class="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white">Salvar</button>
					</div>
				{:else}
					<button onclick={startEdit} class="rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-3">{formatCurrency(collab.base_rate)}</button>
				{/if}
			</div>
		</div>

		<!-- Calendar dashboard -->
		<div class="mb-5">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="font-semibold">Dias Trabalhados</h2>
				<div class="flex items-center gap-2">
					<span class="rounded-lg bg-success/15 px-2.5 py-1 text-sm font-semibold text-success">{allAssignments.length} dias</span>
					<button
						onclick={openAddDay}
						class="rounded-lg bg-accent px-2.5 py-1 text-sm font-medium text-white shadow-md shadow-accent/20 active:scale-95"
					>+ Dia</button>
				</div>
			</div>

			<!-- Add day form -->
			{#if showAddDay}
				<div class="mb-4 rounded-2xl bg-surface p-4 shadow-lg shadow-black/20 ring-1 ring-accent/20 space-y-3">
					<p class="text-sm font-medium">Adicionar dia trabalhado</p>
					<div class="flex items-center gap-2">
						<label class="text-xs text-text-muted">Data</label>
						<input type="date" bind:value={addDayDate} class="flex-1 rounded-lg bg-surface-2 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/50" />
					</div>
					<div class="flex items-center gap-2">
						<label class="text-xs text-text-muted">Valor</label>
						<input type="number" bind:value={addDayRate} class="w-24 rounded-lg bg-surface-2 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/50" />
					</div>
					<div class="flex items-center gap-2">
						<label class="text-xs text-text-muted">Entrada</label>
						<input type="time" bind:value={addDayIn} class="rounded-lg bg-surface-2 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/50" />
						<label class="text-xs text-text-muted">Saída</label>
						<input type="time" bind:value={addDayOut} class="rounded-lg bg-surface-2 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/50" />
					</div>
					<div class="flex gap-2">
						<button onclick={confirmAddDay} class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">Adicionar</button>
						<button onclick={() => (showAddDay = false)} class="rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-text-muted">Cancelar</button>
					</div>
				</div>
			{/if}

			<!-- Month navigation -->
			<div class="mb-3 flex items-center justify-between rounded-xl bg-surface p-3 shadow-md shadow-black/10">
				<button onclick={prevMonth} class="rounded-lg p-1.5 text-text-muted active:scale-90">
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6" /></svg>
				</button>
				<span class="text-sm font-semibold capitalize">
					{calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
				</span>
				<button onclick={nextMonth} class="rounded-lg p-1.5 text-text-muted active:scale-90">
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" /></svg>
				</button>
			</div>

			<!-- Calendar grid -->
			<div class="mb-4 rounded-xl bg-surface p-3 shadow-md shadow-black/10">
				<div class="mb-1 grid grid-cols-7 text-center text-[10px] font-bold text-text-muted">
					<span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
				</div>
				<div class="grid grid-cols-7 gap-0.5 text-center text-xs">
					{#each calendarDays() as day}
						<span
							class="flex h-8 w-8 items-center justify-center rounded-full mx-auto
								{!day.inMonth ? 'text-text-muted/30' : ''}
								{day.worked ? 'bg-success/20 text-success font-bold' : ''}"
						>
							{new Date(day.date + 'T12:00:00').getDate()}
						</span>
					{/each}
				</div>
			</div>

			<!-- Assignment list -->
			{#if allAssignments.length > 0}
				<div class="divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
					{#each allAssignments as a}
						{@const hours = getHoursWorked(a.check_in, a.check_out)}
						{@const effective = collab ? getEffectiveRate(a, collab.base_rate) : 0}
						{#if editingAssignment === a.id}
							<div class="px-4 py-3 space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">{getDayName(a.date)} {formatDate(a.date)}</span>
									<button onclick={() => (editingAssignment = null)} class="text-xs text-text-muted">Cancelar</button>
								</div>
								<div class="flex items-center gap-2">
									<label class="text-[10px] text-text-muted">Valor</label>
									<input type="number" bind:value={editAssignRate} class="w-20 rounded-lg bg-surface-2 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-accent/50" />
								</div>
								<div class="flex items-center gap-2">
									<label class="text-[10px] text-text-muted">Entrada</label>
									<input type="time" bind:value={editAssignIn} class="rounded-lg bg-surface-2 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-accent/50" />
									<label class="text-[10px] text-text-muted">Saída</label>
									<input type="time" bind:value={editAssignOut} class="rounded-lg bg-surface-2 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-accent/50" />
								</div>
								<div class="flex gap-2">
									<button onclick={saveAssignment} class="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white">Salvar</button>
									<button onclick={() => removeDay(a.id, a.date_id)} class="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-accent">Remover dia</button>
								</div>
							</div>
						{:else}
							<div class="flex items-center">
								<button onclick={() => startEditAssignment(a)} class="flex flex-1 items-center justify-between px-4 py-3 text-left transition-colors active:bg-surface-2">
									<div class="text-sm">
										<span class="font-medium">{getDayName(a.date)}</span>
										<span class="text-text-muted"> {formatDate(a.date)}</span>
										{#if hours !== null}
											<span class="ml-1 text-info text-xs">({hours.toFixed(1)}h)</span>
										{/if}
									</div>
									<span class="text-sm font-medium">{formatCurrency(effective)}</span>
								</button>
								<button
									onclick={() => removeDay(a.id, a.date_id)}
									class="mr-3 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent-soft hover:text-accent active:scale-90"
									aria-label="Remover dia"
								>
									<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
								</button>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<div class="mb-3 flex items-center justify-between" style="animation-delay: 80ms">
			<h2 class="font-semibold">Consumo</h2>
			<span class="rounded-lg bg-accent-soft px-2.5 py-1 text-sm font-semibold text-accent">{formatCurrency(total)}</span>
		</div>

		{#if entries.length === 0}
			<p class="py-10 text-center text-sm text-text-muted">Nenhum consumo registrado</p>
		{:else}
			<div class="stagger divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each entries as entry}
					{@const product = entry.product_id ? products.getById(entry.product_id) : null}
					{@const name = entry.custom_name ?? product?.name ?? 'Produto removido'}
					{@const price = entry.custom_price ?? product?.price ?? 0}
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<div class="text-sm font-medium">{name}</div>
							<div class="text-xs text-text-muted">{formatDate(entry.date)} &middot; {entry.quantity}x</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-sm font-medium">{formatCurrency(price * entry.quantity * (1 - DISCOUNT))}</span>
							<button
								onclick={async () => { await consumption.remove(entry.id); toast.info('Consumo removido'); }}
								class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent-soft hover:text-accent"
								aria-label="Remover"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M18 6L6 18M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<PageHeader title="Não encontrado" backHref="/colaboradores" />
	<p class="py-8 text-center text-text-muted">Colaborador não encontrado.</p>
{/if}
