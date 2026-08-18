<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { collaborators, ALL_ROLES, type Role } from '$lib/stores/collaborators.svelte';
	import { consumption, entryValue } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { payments } from '$lib/stores/payments.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { fixedAttendance } from '$lib/stores/fixedAttendance.svelte';
	import { formatCurrency, formatDate, formatDateFull, getDayName, todayISO } from '$lib/utils';
	import { formatPixKeyByType, inferPixKeyType, PIX_KEY_TYPES, type PixKeyType } from '$lib/pix';
	import { getHoursWorked, getEffectiveRate as getEffectiveRateForDay, getShortfallMinutes } from '$lib/shift';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	const collab = $derived(collaborators.getById(page.params.id!));
	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);
	const DISCOUNT = 0.20;
	const getPrice = (id: string) => products.getById(id)?.price ?? 0;

	// Validate a monetary/rate value. Returns the parsed number or null if invalid.
	function parseMoney(raw: unknown): number | null {
		const v = parseFloat(String(raw).replace(',', '.'));
		if (!Number.isFinite(v) || v < 0 || v > 1_000_000) return null;
		return v;
	}
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
	const allAssignments = $derived(
		collab
			? schedule.assignments
					.filter((a) => a.collaborator_id === collab.id)
					.map((a) => {
						const sd = schedule.getDateById(a.date_id);
						return { ...a, date: sd?.date ?? '', dayOfWeek: sd?.day_of_week };
					})
					.filter((a) => a.date)
					.sort((a, b) => b.date.localeCompare(a.date))
			: []
	);

	// Desconta proporcionalmente por atraso/saída antecipada, com base no turno
	// esperado pro dia da semana daquela escala (ver $lib/shift).
	function getEffectiveRate(a: { dayOfWeek?: number; rate_override: number | null; check_in: string | null; check_out: string | null }, baseRate: number): number {
		const rate = a.rate_override ?? baseRate;
		return getEffectiveRateForDay(rate, a.dayOfWeek, a.check_in, a.check_out);
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
		// Empty rate => clear override (use base rate); present value must be valid.
		const isEmpty = editAssignRate === null || String(editAssignRate).trim() === '';
		const rate = isEmpty ? null : parseMoney(editAssignRate);
		if (!isEmpty && rate === null) {
			toast.error('Valor inválido');
			return;
		}
		const rateOverride = rate === null || rate === collab.base_rate ? null : rate;
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
		const rate = parseMoney(addDayRate);
		if (rate === null) {
			toast.error('Valor inválido');
			return;
		}
		try {
			const rateOverride = rate === collab.base_rate ? null : rate;
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
		if (!collab) return;
		const amount = parseMoney(reimbAmount);
		if (amount === null || amount <= 0) {
			toast.error('Valor inválido');
			return;
		}
		await purchases.add({
			amount,
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
		const rate = parseMoney(editRate);
		if (rate === null) {
			toast.error('Valor inválido');
			return;
		}
		await collaborators.update(collab.id, { base_rate: rate });
		toast.success(`Valor atualizado para ${formatCurrency(rate)}`);
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

	// Assiduidade (só fixos): ponto separado de pagamento — ver $lib/stores/fixedAttendance.
	// Pagamento de fixo é valor combinado à parte; isso é só acompanhamento de atraso.
	const currentYearMonth = todayISO().slice(0, 7);
	const monthAttendance = $derived(
		collab ? fixedAttendance.getByCollaboratorMonth(collab.id, currentYearMonth) : []
	);
	const monthShortfallMinutes = $derived(
		monthAttendance.reduce((sum, a) => {
			const dow = new Date(a.date + 'T12:00:00').getDay();
			return sum + getShortfallMinutes(dow, a.check_in, a.check_out);
		}, 0)
	);

	function formatMinutes(min: number): string {
		if (min < 60) return `${min}min`;
		const h = Math.floor(min / 60);
		const m = min % 60;
		return m === 0 ? `${h}h` : `${h}h${m}min`;
	}

	let editingAttendance = $state<string | null>(null);
	let editAttendIn = $state('');
	let editAttendOut = $state('');

	function startEditAttendance(a: { date: string; check_in: string | null; check_out: string | null }) {
		editingAttendance = a.date;
		editAttendIn = a.check_in ?? '';
		editAttendOut = a.check_out ?? '';
	}

	async function saveAttendance() {
		if (!collab || !editingAttendance) return;
		await fixedAttendance.setTimes(collab.id, editingAttendance, editAttendIn || null, editAttendOut || null);
		toast.success('Ponto atualizado');
		editingAttendance = null;
	}

	let showDeleteConfirm = $state(false);

	async function deleteCollaborator() {
		if (!collab) return;
		try {
			await collaborators.remove(collab.id);
			toast.success(`${collab.name} excluído`);
			goto('/colaboradores');
		} catch (e: any) {
			toast.error(e.message ?? 'Erro ao excluir');
			showDeleteConfirm = false;
		}
	}
</script>

{#if collab}
	<PageHeader title={collab.name} backHref="/colaboradores" />

	<div class="px-4 py-4">
		<div class="animate-in mb-4 rounded-2xl bg-card p-5 shadow-lg shadow-black/20">
			<!-- Name -->
			<div class="mb-4 border-b border-border pb-4">
				{#if editingName}
					<div class="flex items-center gap-2">
						<Input
							bind:value={editName}
							placeholder="Nome"
							class="flex-1 text-lg font-semibold"
						/>
						<Button size="sm" onclick={saveName}>Salvar</Button>
						<Button variant="secondary" size="sm" onclick={() => (editingName = false)}>Cancelar</Button>
					</div>
				{:else}
					<button onclick={startEditName} class="flex w-full items-center justify-between text-left">
						<span class="text-lg font-semibold">{collab.name}</span>
						<SquarePen class="h-4 w-4 text-muted-foreground" />
					</button>
				{/if}
			</div>
			<div class="mb-4 flex items-center justify-between">
				<button
					onclick={async () => { await collaborators.update(collab.id, { fixed: !collab.fixed }); toast.success(collab.fixed ? 'Agora é freela' : 'Agora é fixo'); }}
					class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all
						{collab.fixed ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-muted text-muted-foreground'}"
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
				<div class="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Funções</div>
				<div class="flex flex-wrap gap-1.5">
					{#each ALL_ROLES as { value, label }}
						{@const active = collab.roles.includes(value)}
						<button
							onclick={() => toggleRole(value)}
							class="rounded-lg px-3 py-1.5 text-xs font-medium transition-all
								{active ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
						>
							{label}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-sm text-muted-foreground">Valor/dia</span>
				{#if editing}
					<div class="flex items-center gap-2">
						<Input
							bind:value={editRate}
							type="number"
							min="0"
							class="w-24 text-right"
						/>
						<Button size="sm" onclick={saveRate}>Salvar</Button>
					</div>
				{:else}
					<button onclick={startEdit} class="rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-accent">{formatCurrency(collab.base_rate)}</button>
				{/if}
			</div>

			<div class="mt-3">
				{#if editingPix}
					<div class="space-y-2">
						<span class="text-sm text-muted-foreground">Chave PIX</span>
						<div class="flex flex-wrap gap-1.5">
							{#each PIX_KEY_TYPES as { value, label }}
								<button
									type="button"
									onclick={() => (editPixType = value)}
									class="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all
										{editPixType === value ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
								>
									{label}
								</button>
							{/each}
						</div>
						<Input
							bind:value={editPixKey}
							inputmode={editPixType === 'cpf' || editPixType === 'cnpj' || editPixType === 'telefone' ? 'tel' : editPixType === 'email' ? 'email' : 'text'}
							placeholder={editPixType === 'cpf' ? '000.000.000-00' : editPixType === 'cnpj' ? '00.000.000/0000-00' : editPixType === 'telefone' ? '(11) 99999-9999' : editPixType === 'email' ? 'voce@email.com' : 'chave aleatória'}
						/>
						<div class="flex gap-2">
							<Button size="sm" class="flex-1" onclick={savePix}>Salvar</Button>
							<Button variant="secondary" size="sm" onclick={() => (editingPix = false)}>Cancelar</Button>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Chave PIX</span>
						<button onclick={startEditPix} class="max-w-[55%] truncate rounded-lg bg-muted px-3 py-1.5 text-right text-xs font-medium transition-colors hover:bg-accent">
							{collab.pix_key ?? 'Adicionar'}
						</button>
					</div>
				{/if}
			</div>

			<div class="mt-4 border-t border-border pt-4">
				{#if showDeleteConfirm}
					<div class="rounded-xl bg-destructive/10 p-3 space-y-2">
						<p class="text-xs font-medium text-destructive">
							Excluir {collab.name}? Isso apaga o histórico de escalas/consumo dele(a) já pagas
							(os valores continuam no Resumo de Pagamentos). Não pode ser desfeito.
							{#if collab.fixed}
								{' '}Ele(a) é colaborador fixo — todas as escalas futuras dele(a) também serão perdidas.
							{/if}
						</p>
						<div class="flex gap-2">
							<Button variant="destructive" size="sm" class="flex-1" onclick={deleteCollaborator}>Confirmar exclusão</Button>
							<Button variant="secondary" size="sm" onclick={() => (showDeleteConfirm = false)}>Cancelar</Button>
						</div>
					</div>
				{:else}
					<button
						onclick={() => (showDeleteConfirm = true)}
						class="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
					>
						<Trash2 class="h-3.5 w-3.5" />
						Excluir Colaborador
					</button>
				{/if}
			</div>
		</div>

		{#if collab.fixed}
			<!-- Assiduidade: ponto de acompanhamento, não afeta pagamento (valor fixo à parte) -->
			<div class="mb-5">
				<div class="mb-3 flex items-center justify-between">
					<h2 class="font-semibold">Assiduidade</h2>
					<span class="rounded-lg px-2.5 py-1 text-sm font-semibold {monthShortfallMinutes > 0 ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}">
						{monthShortfallMinutes > 0 ? `${formatMinutes(monthShortfallMinutes)} de atraso no mês` : 'Sem atrasos no mês'}
					</span>
				</div>
				<p class="mb-3 text-xs text-muted-foreground">Ponto só pra acompanhamento — não afeta o pagamento, que é valor fixo combinado à parte.</p>

				{#if monthAttendance.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">Nenhum ponto registrado este mês</p>
				{:else}
					<div class="stagger divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
						{#each monthAttendance as a (a.id)}
							{@const dow = new Date(a.date + 'T12:00:00').getDay()}
							{@const shortfall = getShortfallMinutes(dow, a.check_in, a.check_out)}
							{#if editingAttendance === a.date}
								<div class="px-4 py-3 space-y-2">
									<div class="flex items-center justify-between">
										<span class="text-sm font-medium">{getDayName(a.date)} {formatDate(a.date)}</span>
										<button onclick={() => (editingAttendance = null)} class="text-xs text-muted-foreground">Cancelar</button>
									</div>
									<div class="flex items-center gap-2">
										<Label for="edit-attend-in" class="text-[10px] text-muted-foreground">Entrada</Label>
										<input id="edit-attend-in" type="time" bind:value={editAttendIn} class="rounded-lg bg-muted px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-info/50" />
										<Label for="edit-attend-out" class="text-[10px] text-muted-foreground">Saída</Label>
										<input id="edit-attend-out" type="time" bind:value={editAttendOut} class="rounded-lg bg-muted px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-info/50" />
									</div>
									<Button size="sm" onclick={saveAttendance}>Salvar</Button>
								</div>
							{:else}
								<button onclick={() => startEditAttendance(a)} class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-muted">
									<div class="text-sm">
										<span class="font-medium">{getDayName(a.date)}</span>
										<span class="text-muted-foreground"> {formatDate(a.date)}</span>
										{#if a.check_in || a.check_out}
											<span class="ml-1 text-xs text-info">{a.check_in ?? '?'}–{a.check_out ?? '?'}</span>
										{/if}
									</div>
									{#if shortfall > 0}
										<span class="text-xs font-medium text-warning">{formatMinutes(shortfall)}</span>
									{/if}
								</button>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Calendar dashboard -->
		<div class="mb-5">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="font-semibold">Dias Trabalhados</h2>
				<div class="flex items-center gap-2">
					<span class="rounded-lg bg-success/15 px-2.5 py-1 text-sm font-semibold text-success">{allAssignments.length} dias</span>
					<Button size="xs" class="shadow-md shadow-primary/20" onclick={openAddDay}>+ Dia</Button>
				</div>
			</div>

			<!-- Add day form -->
			{#if showAddDay}
				<div class="mb-4 rounded-2xl bg-card p-4 shadow-lg shadow-black/20 ring-1 ring-primary/20 space-y-3">
					<p class="text-sm font-medium">Adicionar dia trabalhado</p>
					<div class="flex items-center gap-2">
						<Label for="add-day-date" class="text-xs text-muted-foreground">Data</Label>
						<input id="add-day-date" type="date" bind:value={addDayDate} class="flex-1 rounded-lg bg-muted px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
					</div>
					<div class="flex items-center gap-2">
						<Label for="add-day-rate" class="text-xs text-muted-foreground">Valor</Label>
						<Input id="add-day-rate" type="number" min="0" bind:value={addDayRate} class="w-24" />
					</div>
					<div class="flex items-center gap-2">
						<Label for="add-day-in" class="text-xs text-muted-foreground">Entrada</Label>
						<input id="add-day-in" type="time" bind:value={addDayIn} class="rounded-lg bg-muted px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
						<Label for="add-day-out" class="text-xs text-muted-foreground">Saída</Label>
						<input id="add-day-out" type="time" bind:value={addDayOut} class="rounded-lg bg-muted px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
					</div>
					<div class="flex gap-2">
						<Button onclick={confirmAddDay}>Adicionar</Button>
						<Button variant="secondary" onclick={() => (showAddDay = false)}>Cancelar</Button>
					</div>
				</div>
			{/if}

			<!-- Month navigation -->
			<div class="mb-3 flex items-center justify-between rounded-xl bg-card p-3 shadow-md shadow-black/10">
				<Button variant="ghost" size="icon-sm" class="text-muted-foreground" onclick={prevMonth} aria-label="Mês anterior">
					<ChevronLeft />
				</Button>
				<span class="text-sm font-semibold capitalize">
					{calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
				</span>
				<Button variant="ghost" size="icon-sm" class="text-muted-foreground" onclick={nextMonth} aria-label="Próximo mês">
					<ChevronRight />
				</Button>
			</div>

			<!-- Calendar grid -->
			<div class="mb-4 rounded-xl bg-card p-3 shadow-md shadow-black/10">
				<div class="mb-1 grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground">
					<span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
				</div>
				<div class="grid grid-cols-7 gap-0.5 text-center text-xs">
					{#each calendarDays as day (day.date)}
						<span
							class="flex h-8 w-8 items-center justify-center rounded-full mx-auto
								{!day.inMonth ? 'text-muted-foreground/30' : ''}
								{day.worked ? 'bg-success/20 text-success font-bold' : ''}"
						>
							{new Date(day.date + 'T12:00:00').getDate()}
						</span>
					{/each}
				</div>
			</div>

			<!-- Assignment list -->
			{#if allAssignments.length > 0}
				<div class="divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
					{#each allAssignments as a (a.id)}
						{@const hours = getHoursWorked(a.check_in, a.check_out)}
						{@const effective = collab ? getEffectiveRate(a, collab.base_rate) : 0}
						{#if editingAssignment === a.id}
							<div class="px-4 py-3 space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">{getDayName(a.date)} {formatDate(a.date)}</span>
									<button onclick={() => (editingAssignment = null)} class="text-xs text-muted-foreground">Cancelar</button>
								</div>
								<div class="flex items-center gap-2">
									<Label for="edit-assign-rate" class="text-[10px] text-muted-foreground">Valor</Label>
									<Input id="edit-assign-rate" type="number" min="0" bind:value={editAssignRate} class="w-20" />
								</div>
								<div class="flex items-center gap-2">
									<Label for="edit-assign-in" class="text-[10px] text-muted-foreground">Entrada</Label>
									<input id="edit-assign-in" type="time" bind:value={editAssignIn} class="rounded-lg bg-muted px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/50" />
									<Label for="edit-assign-out" class="text-[10px] text-muted-foreground">Saída</Label>
									<input id="edit-assign-out" type="time" bind:value={editAssignOut} class="rounded-lg bg-muted px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/50" />
								</div>
								<div class="flex gap-2">
									<Button size="sm" onclick={saveAssignment}>Salvar</Button>
									<Button variant="destructive" size="sm" onclick={() => removeDay(a.id, a.date_id)}>Remover dia</Button>
								</div>
							</div>
						{:else}
							<div class="flex items-center">
								<button onclick={() => startEditAssignment(a)} class="flex flex-1 items-center justify-between px-4 py-3 text-left transition-colors active:bg-muted">
									<div class="text-sm">
										<span class="font-medium">{getDayName(a.date)}</span>
										<span class="text-muted-foreground"> {formatDate(a.date)}</span>
										{#if hours !== null}
											<span class="ml-1 text-info text-xs">({hours.toFixed(1)}h)</span>
										{/if}
									</div>
									<span class="text-sm font-medium">{formatCurrency(effective)}</span>
								</button>
								<button
									onclick={() => removeDay(a.id, a.date_id)}
									class="mr-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary active:scale-90"
									aria-label="Remover dia"
								>
									<X class="h-4 w-4" />
								</button>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<div class="mb-3 flex items-center justify-between" style="animation-delay: 80ms">
			<h2 class="font-semibold">Consumo</h2>
			<span class="rounded-lg bg-primary/15 px-2.5 py-1 text-sm font-semibold text-primary">{formatCurrency(total)}</span>
		</div>

		{#if entries.length === 0}
			<p class="py-10 text-center text-sm text-muted-foreground">Nenhum consumo registrado</p>
		{:else}
			<div class="stagger divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
				{#each entries as entry (entry.id)}
					{@const product = entry.product_id ? products.getById(entry.product_id) : null}
					{@const name = entry.custom_name ?? product?.name ?? 'Produto removido'}
					<div class="flex items-center justify-between px-4 py-3">
						<div>
							<div class="text-sm font-medium">{name}</div>
							<div class="text-xs text-muted-foreground">
								{formatDate(entry.date)} &middot; {entry.quantity}x
								{#if entry.split_count > 1}<span class="text-primary"> &middot; dividido ÷{entry.split_count}</span>{/if}
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-sm font-medium">{formatCurrency(entryValue(entry, getPrice))}</span>
							<button
								onclick={async () => { await consumption.remove(entry.id); toast.info('Consumo removido'); }}
								class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
								aria-label="Remover"
							>
								<X class="h-4 w-4" />
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
					<Button size="xs" class="shadow-md shadow-primary/20" onclick={() => { showAddReimbursement = !showAddReimbursement; reimbDate = todayISO(); }}>
						+ Ressarcimento
					</Button>
				</div>
			</div>

			{#if showAddReimbursement}
				<div class="mb-3 rounded-2xl bg-card p-4 shadow-lg shadow-black/20 ring-1 ring-primary/20 space-y-3">
					<div class="flex items-center gap-2">
						<Label for="reimb-amount" class="text-xs text-muted-foreground">Valor</Label>
						<Input id="reimb-amount" type="number" bind:value={reimbAmount} step="0.01" min="0" class="w-28" />
					</div>
					<div class="flex items-center gap-2">
						<Label for="reimb-date" class="text-xs text-muted-foreground">Data</Label>
						<input id="reimb-date" type="date" bind:value={reimbDate} class="rounded-lg bg-muted px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
					</div>
					<div class="flex items-center gap-2">
						<Label for="reimb-notes" class="text-xs text-muted-foreground">Nota</Label>
						<Input id="reimb-notes" type="text" bind:value={reimbNotes} placeholder="Ex: Uber, gelo, etc." class="flex-1" />
					</div>
					<div class="flex gap-2">
						<Button onclick={addReimbursement}>Adicionar</Button>
						<Button variant="secondary" onclick={() => (showAddReimbursement = false)}>Cancelar</Button>
					</div>
				</div>
			{/if}

			{#if reimbursements.length === 0}
				<p class="text-center text-sm text-muted-foreground py-4">Nenhum ressarcimento pendente</p>
			{:else}
				<div class="divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
					{#each reimbursements as p (p.id)}
						<div class="flex items-center justify-between px-4 py-3">
							<div>
								<div class="text-sm font-medium">{p.notes || 'Ressarcimento'}</div>
								<div class="text-xs text-muted-foreground">{formatDate(p.date)}</div>
							</div>
							<div class="flex items-center gap-3">
								<span class="text-sm font-semibold text-warning">{formatCurrency(p.amount)}</span>
								<button
									onclick={async () => { await purchases.markReimbursed(p.id); toast.info('Marcado como pago'); }}
									class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-success/15 hover:text-success"
									aria-label="Marcar como pago"
								>
									<Check class="h-4 w-4" />
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
					<span class="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{paymentHistory.length}</span>
				{/if}
			</div>

			{#if paymentHistory.length === 0}
				<p class="text-center text-sm text-muted-foreground py-4">Nenhum pagamento registrado</p>
			{:else}
				<div class="divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
					{#each paymentHistory as pmt (pmt.id)}
						{@const expanded = expandedPayment === pmt.id}
						{@const pmtAssignments = schedule.getAssignmentsByPayment(pmt.id)}
						{@const pmtConsumption = consumption.getByPayment(pmt.id)}
						{@const pmtPurchases = purchases.getByPayment(pmt.id)}
						<div>
							<button
								onclick={() => togglePayment(pmt.id)}
								class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-muted"
							>
								<div>
									<div class="text-sm font-medium">{formatDateFull(pmt.paid_at.slice(0, 10))}</div>
									<div class="mt-0.5 text-[11px] text-muted-foreground">
										{formatCurrency(pmt.total_earned)} ganhos · {formatCurrency(pmt.total_consumed)} consumo{pmt.total_reimbursed > 0 ? ` · +${formatCurrency(pmt.total_reimbursed)} ressarc.` : ''}
									</div>
								</div>
								<div class="flex items-center gap-2">
									<span class="rounded-lg bg-success/15 px-2.5 py-1 text-sm font-bold text-success">{formatCurrency(pmt.net_amount)}</span>
									<ChevronRight class="h-4 w-4 text-muted-foreground transition-transform {expanded ? 'rotate-90' : ''}" />
								</div>
							</button>
							{#if expanded}
								<div class="space-y-3 bg-muted/40 px-4 py-3 text-xs">
									{#if pmtAssignments.length > 0}
										<div>
											<div class="mb-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Dias pagos</div>
											{#each pmtAssignments as a (a.id)}
												{@const sd = schedule.getDateById(a.date_id)}
												<div class="flex justify-between py-0.5">
													<span>{sd ? `${getDayName(sd.date)} ${formatDate(sd.date)}` : 'dia removido'}</span>
													<span class="font-medium">{formatCurrency(getEffectiveRateForDay(a.rate_override ?? collab.base_rate, sd?.day_of_week, a.check_in, a.check_out))}</span>
												</div>
											{/each}
										</div>
									{/if}
									{#if pmtConsumption.length > 0}
										<div>
											<div class="mb-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Consumo descontado</div>
											{#each pmtConsumption as e (e.id)}
												{@const product = e.product_id ? products.getById(e.product_id) : null}
												{@const name = e.custom_name ?? product?.name ?? 'Produto removido'}
												<div class="flex justify-between py-0.5">
													<span>{name} <span class="text-muted-foreground">x{e.quantity}{#if e.split_count > 1} ÷{e.split_count}{/if}</span></span>
													<span class="font-medium text-primary">-{formatCurrency(entryValue(e, getPrice))}</span>
												</div>
											{/each}
										</div>
									{/if}
									{#if pmtPurchases.length > 0}
										<div>
											<div class="mb-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Ressarcimentos</div>
											{#each pmtPurchases as p (p.id)}
												<div class="flex justify-between py-0.5">
													<span>{p.notes || 'Ressarcimento'} <span class="text-muted-foreground">{formatDate(p.date)}</span></span>
													<span class="font-medium text-warning">+{formatCurrency(p.amount)}</span>
												</div>
											{/each}
										</div>
									{/if}
									{#if pmt.pix_key_used}
										<div class="text-[10px] text-muted-foreground">PIX usado: {pmt.pix_key_used}</div>
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
	<p class="py-8 text-center text-muted-foreground">Colaborador não encontrado.</p>
{/if}
