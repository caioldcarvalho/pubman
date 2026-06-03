<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { collaborators, ALL_ROLES, type Role } from '$lib/stores/collaborators.svelte';
	import { consumption, entryValue } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { payments } from '$lib/stores/payments.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate, formatDateFull, getDayName, todayISO } from '$lib/utils';
	import { formatPixKeyByType, inferPixKeyType, PIX_KEY_TYPES, type PixKeyType } from '$lib/pix';

	const collab = $derived(collaborators.getById(page.params.id));
	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);
	const DISCOUNT = 0.20;
	const getPrice = (id: string) => products.getById(id)?.price ?? 0;
	const total = $derived(
		entries.reduce((sum, e) => sum + entryValue(e, getPrice), 0)
	);

	let editing = $state(false);
	let editRate = $state(0);

	// Name editing
	let editingName = $state(false);
	let editName = $state('');

	function startEditName() {
		if (!collab) return;
		editName = collab.name;
		editingName = true;
	}

	async function saveName() {
		if (!collab) return;
		const trimmed = editName.trim();
		if (!trimmed) return;
		await collaborators.update(collab.id, { name: trimmed });
		toast.success('Nome atualizado');
		editingName = false;
	}

	let editingPix = $state(false);
	let editPixKey = $state('');
	let editPixType = $state<PixKeyType>('cpf');

	function startEditPix() {
		if (!collab) return;
		editPixKey = collab.pix_key ?? '';
		editPixType = collab.pix_key ? inferPixKeyType(collab.pix_key) : 'cpf';
		editingPix = true;
	}

	async function savePix() {
		if (!collab) return;
		const formatted = editPixKey.trim() === '' ? null : formatPixKeyByType(editPixKey, editPixType);
		await collaborators.update(collab.id, { pix_key: formatted });
		toast.success(formatted ? 'Chave PIX atualizada' : 'Chave PIX removida');
		editingPix = false;
	}

	// Payment history
	const paymentHistory = $derived(collab ? payments.getByCollaborator(collab.id) : []);
	let expandedPayment = $state<string | null>(null);

	function togglePayment(id: string) {
		expandedPayment = expandedPayment === id ? null : id;
	}

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
	const calendarDays = $derived.by(() => {
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

	// Reimbursements for this collaborator
	const reimbursements = $derived(
		collab ? purchases.pendingByCollaborator(collab.id) : []
	);
	const totalReimbursements = $derived(
		reimbursements.reduce((sum, p) => sum + p.amount, 0)
	);

	let showAddReimbursement = $state(false);
	let reimbAmount = $state(0);
	let reimbNotes = $state('');
	let reimbDate = $state(todayISO());

	async function addReimbursement() {
		if (!collab || reimbAmount <= 0) return;
		await purchases.add({
			amount: reimbAmount,
			date: reimbDate,
			notes: reimbNotes,
			collaborator_id: collab.id,
		});
		toast.success('Ressarcimento adicionado');
		showAddReimbursement = false;
		reimbAmount = 0;
		reimbNotes = '';
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
			<!-- Name -->
			<div class="mb-4 border-b border-surface-2 pb-4">
				{#if editingName}
					<div class="flex items-center gap-2">
						<input
							bind:value={editName}
							placeholder="Nome"
							class="flex-1 rounded-xl bg-surface-2 px-3 py-2 text-lg font-semibold outline-none focus:ring-2 focus:ring-accent/50"
						/>
						<button onclick={saveName} class="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white">Salvar</button>
						<button onclick={() => (editingName = false)} class="rounded-lg bg-surface-2 px-3 py-2 text-xs font-medium text-text-muted">Cancelar</button>
					</div>
				{:else}
					<button onclick={startEditName} class="flex w-full items-center justify-between text-left">
						<span class="text-lg font-semibold">{collab.name}</span>
						<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
					</button>
				{/if}
			</div>
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

			<div class="mt-3">
				{#if editingPix}
					<div class="space-y-2">
						<span class="text-sm text-text-muted">Chave PIX</span>
						<div class="flex flex-wrap gap-1.5">
							{#each PIX_KEY_TYPES as { value, label }}
								<button
									type="button"
									onclick={() => (editPixType = value)}
									class="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all
										{editPixType === value ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-surface-2 text-text-muted'}"
								>
									{label}
								</button>
							{/each}
						</div>
						<input
							bind:value={editPixKey}
							inputmode={editPixType === 'cpf' || editPixType === 'cnpj' || editPixType === 'telefone' ? 'tel' : editPixType === 'email' ? 'email' : 'text'}
							placeholder={editPixType === 'cpf' ? '000.000.000-00' : editPixType === 'cnpj' ? '00.000.000/0000-00' : editPixType === 'telefone' ? '(11) 99999-9999' : editPixType === 'email' ? 'voce@email.com' : 'chave aleatória'}
							class="w-full rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
						/>
						<div class="flex gap-2">
							<button onclick={savePix} class="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white">Salvar</button>
							<button onclick={() => (editingPix = false)} class="rounded-lg bg-surface-2 px-3 py-2 text-xs font-medium text-text-muted">Cancelar</button>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-between">
						<span class="text-sm text-text-muted">Chave PIX</span>
						<button onclick={startEditPix} class="max-w-[55%] truncate rounded-lg bg-surface-2 px-3 py-1.5 text-right text-xs font-medium transition-colors hover:bg-surface-3">
							{collab.pix_key ?? 'Adicionar'}
						</button>
					</div>
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
					{#each calendarDays as day (day.date)}
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
					{#each allAssignments as a (a.id)}
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
				{#each entries as entry (entry.id)}
					{@const product = entry.product_id ? products.getById(entry.product_id) : null}
					{@const name = entry.custom_name ?? product?.name ?? 'Produto removido'}
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<div class="text-sm font-medium">{name}</div>
							<div class="text-xs text-text-muted">
								{formatDate(entry.date)} &middot; {entry.quantity}x
								{#if entry.split_count > 1}<span class="text-accent"> &middot; dividido ÷{entry.split_count}</span>{/if}
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-sm font-medium">{formatCurrency(entryValue(entry, getPrice))}</span>
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
		<!-- Reimbursements -->
		<div class="mb-5 mt-5">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="font-semibold">Ressarcimentos</h2>
				<div class="flex items-center gap-2">
					{#if totalReimbursements > 0}
						<span class="rounded-lg bg-warning/15 px-2.5 py-1 text-sm font-semibold text-warning">{formatCurrency(totalReimbursements)}</span>
					{/if}
					<button
						onclick={() => { showAddReimbursement = !showAddReimbursement; reimbDate = todayISO(); }}
						class="rounded-lg bg-accent px-2.5 py-1 text-sm font-medium text-white shadow-md shadow-accent/20 active:scale-95"
					>+ Ressarcimento</button>
				</div>
			</div>

			{#if showAddReimbursement}
				<div class="mb-3 rounded-2xl bg-surface p-4 shadow-lg shadow-black/20 ring-1 ring-accent/20 space-y-3">
					<div class="flex items-center gap-2">
						<label class="text-xs text-text-muted">Valor</label>
						<input type="number" bind:value={reimbAmount} step="0.01" class="w-28 rounded-lg bg-surface-2 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/50" />
					</div>
					<div class="flex items-center gap-2">
						<label class="text-xs text-text-muted">Data</label>
						<input type="date" bind:value={reimbDate} class="rounded-lg bg-surface-2 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/50" />
					</div>
					<div class="flex items-center gap-2">
						<label class="text-xs text-text-muted">Nota</label>
						<input type="text" bind:value={reimbNotes} placeholder="Ex: Uber, gelo, etc." class="flex-1 rounded-lg bg-surface-2 px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/50" />
					</div>
					<div class="flex gap-2">
						<button onclick={addReimbursement} class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">Adicionar</button>
						<button onclick={() => (showAddReimbursement = false)} class="rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-text-muted">Cancelar</button>
					</div>
				</div>
			{/if}

			{#if reimbursements.length === 0}
				<p class="text-center text-sm text-text-muted py-4">Nenhum ressarcimento pendente</p>
			{:else}
				<div class="divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
					{#each reimbursements as p (p.id)}
						<div class="flex items-center justify-between px-4 py-3">
							<div>
								<div class="text-sm font-medium">{p.notes || 'Ressarcimento'}</div>
								<div class="text-xs text-text-muted">{formatDate(p.date)}</div>
							</div>
							<div class="flex items-center gap-3">
								<span class="text-sm font-semibold text-warning">{formatCurrency(p.amount)}</span>
								<button
									onclick={async () => { await purchases.markReimbursed(p.id); toast.info('Marcado como pago'); }}
									class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-success/15 hover:text-success"
									aria-label="Marcar como pago"
								>
									<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" /></svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Payment history -->
		<div class="mb-5">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="font-semibold">Histórico de Pagamentos</h2>
				{#if paymentHistory.length > 0}
					<span class="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-muted">{paymentHistory.length}</span>
				{/if}
			</div>

			{#if paymentHistory.length === 0}
				<p class="text-center text-sm text-text-muted py-4">Nenhum pagamento registrado</p>
			{:else}
				<div class="divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
					{#each paymentHistory as pmt (pmt.id)}
						{@const expanded = expandedPayment === pmt.id}
						{@const pmtAssignments = schedule.getAssignmentsByPayment(pmt.id)}
						{@const pmtConsumption = consumption.getByPayment(pmt.id)}
						{@const pmtPurchases = purchases.getByPayment(pmt.id)}
						<div>
							<button
								onclick={() => togglePayment(pmt.id)}
								class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-surface-2"
							>
								<div>
									<div class="text-sm font-medium">{formatDateFull(pmt.paid_at.slice(0, 10))}</div>
									<div class="mt-0.5 text-[11px] text-text-muted">
										{formatCurrency(pmt.total_earned)} ganhos · {formatCurrency(pmt.total_consumed)} consumo{pmt.total_reimbursed > 0 ? ` · +${formatCurrency(pmt.total_reimbursed)} ressarc.` : ''}
									</div>
								</div>
								<div class="flex items-center gap-2">
									<span class="rounded-lg bg-success/15 px-2.5 py-1 text-sm font-bold text-success">{formatCurrency(pmt.net_amount)}</span>
									<svg class="h-4 w-4 text-text-muted transition-transform {expanded ? 'rotate-90' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" /></svg>
								</div>
							</button>
							{#if expanded}
								<div class="space-y-3 bg-surface-2/40 px-4 py-3 text-xs">
									{#if pmtAssignments.length > 0}
										<div>
											<div class="mb-1.5 font-bold uppercase tracking-wider text-text-muted text-[10px]">Dias pagos</div>
											{#each pmtAssignments as a (a.id)}
												{@const sd = schedule.getDateById(a.date_id)}
												<div class="flex justify-between py-0.5">
													<span>{sd ? `${getDayName(sd.date)} ${formatDate(sd.date)}` : 'dia removido'}</span>
													<span class="font-medium">{formatCurrency(a.rate_override ?? collab.base_rate)}</span>
												</div>
											{/each}
										</div>
									{/if}
									{#if pmtConsumption.length > 0}
										<div>
											<div class="mb-1.5 font-bold uppercase tracking-wider text-text-muted text-[10px]">Consumo descontado</div>
											{#each pmtConsumption as e (e.id)}
												{@const product = e.product_id ? products.getById(e.product_id) : null}
												{@const name = e.custom_name ?? product?.name ?? 'Produto removido'}
												<div class="flex justify-between py-0.5">
													<span>{name} <span class="text-text-muted">x{e.quantity}{#if e.split_count > 1} ÷{e.split_count}{/if}</span></span>
													<span class="font-medium text-accent">-{formatCurrency(entryValue(e, getPrice))}</span>
												</div>
											{/each}
										</div>
									{/if}
									{#if pmtPurchases.length > 0}
										<div>
											<div class="mb-1.5 font-bold uppercase tracking-wider text-text-muted text-[10px]">Ressarcimentos</div>
											{#each pmtPurchases as p (p.id)}
												<div class="flex justify-between py-0.5">
													<span>{p.notes || 'Ressarcimento'} <span class="text-text-muted">{formatDate(p.date)}</span></span>
													<span class="font-medium text-warning">+{formatCurrency(p.amount)}</span>
												</div>
											{/each}
										</div>
									{/if}
									{#if pmt.pix_key_used}
										<div class="text-[10px] text-text-muted">PIX usado: {pmt.pix_key_used}</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{:else}
	<PageHeader title="Não encontrado" backHref="/colaboradores" />
	<p class="py-8 text-center text-text-muted">Colaborador não encontrado.</p>
{/if}
