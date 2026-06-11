<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';

	import { collaborators, COLLABORATOR_DISCOUNT } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { events } from '$lib/stores/events.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate, getDayName, todayISO } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';

	const todayStr = todayISO();

	// Find next scheduled date (today or future)
	const nextScheduleDate = $derived(
		schedule.dates
			.filter((d) => d.date >= todayStr)
			.sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
	);

	// Find the following scheduled date
	const followingDate = $derived(
		nextScheduleDate
			? schedule.dates
					.filter((d) => d.date > nextScheduleDate.date)
					.sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
			: null
	);

	const nextAssigned = $derived(
		nextScheduleDate ? schedule.getAssignments(nextScheduleDate.id) : []
	);
	const followingAssigned = $derived(
		followingDate ? schedule.getAssignments(followingDate.id) : []
	);

	const nextEvents = $derived(nextScheduleDate ? events.getByDateId(nextScheduleDate.id) : []);
	const followingEvents = $derived(followingDate ? events.getByDateId(followingDate.id) : []);

	// All fixed staff
	const allFixed = $derived(collaborators.fixedStaff);

	// Toggle to include fixed in total
	let includeFixed = $state(false);

	// Total to pay for next night's freelas
	const totalFreelas = $derived(
		nextAssigned.reduce((sum, a) => {
			const c = collaborators.getById(a.collaborator_id);
			if (!c || c.fixed) return sum;
			const earned = getEffectiveRate(a, c.base_rate);
			const consumed = consumption.totalByCollaborator(c.id, (pid) => products.getPrice(pid));
			return sum + earned - consumed;
		}, 0)
	);

	const totalFixed = $derived(
		allFixed.reduce((sum, c) => {
			const consumed = consumption.totalByCollaborator(c.id, (pid) => products.getPrice(pid));
			return sum + c.base_rate - consumed;
		}, 0)
	);

	const totalToRepass = $derived(includeFixed ? totalFreelas + totalFixed : totalFreelas);

	// Quick add: available freelancers not yet assigned (all roles)
	let showQuickAdd = $state(false);
	const availableToAdd = $derived(
		nextScheduleDate
			? collaborators.freelancers.filter(
					(c) => !nextAssigned.some((a) => a.collaborator_id === c.id)
				)
			: []
	);

	async function quickAssign(collabId: string) {
		if (!nextScheduleDate) return;
		await schedule.toggleAssignment(nextScheduleDate.id, collabId);
		const name = collaborators.getById(collabId)?.name ?? '';
		toast.success(`${name} adicionado`);
		showQuickAdd = false;
	}

	async function removeAssignment(collabId: string) {
		if (!nextScheduleDate) return;
		await schedule.toggleAssignment(nextScheduleDate.id, collabId);
		const name = collaborators.getById(collabId)?.name ?? '';
		toast.info(`${name} removido`);
	}

	// Standard shift duration (hours) - used for proportional pay
	const FULL_SHIFT_HOURS = 6;

	function getHoursWorked(checkIn: string | null, checkOut: string | null): number | null {
		if (!checkIn || !checkOut) return null;
		const [h1, m1] = checkIn.split(':').map(Number);
		const [h2, m2] = checkOut.split(':').map(Number);
		let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
		if (diff < 0) diff += 24 * 60; // crossed midnight
		return diff / 60;
	}

	function getEffectiveRate(assignment: { rate_override: number | null; check_in: string | null; check_out: string | null }, baseRate: number): number {
		const rate = assignment.rate_override ?? baseRate;
		const hours = getHoursWorked(assignment.check_in, assignment.check_out);
		if (hours === null) return rate;
		return rate * (hours / FULL_SHIFT_HOURS);
	}

	async function setTime(assignmentId: string, field: 'check_in' | 'check_out', value: string) {
		const a = nextAssigned.find((x) => x.id === assignmentId);
		if (!a) return;
		const checkIn = field === 'check_in' ? (value || null) : a.check_in;
		const checkOut = field === 'check_out' ? (value || null) : a.check_out;
		await schedule.updateAssignmentTimes(assignmentId, checkIn, checkOut);
	}

	// Dynamic title
	const pageTitle = $derived(
		nextScheduleDate
			? nextScheduleDate.date === todayStr
				? 'Hoje'
				: `${getDayName(nextScheduleDate.date)} ${formatDate(nextScheduleDate.date)}`
			: 'Próxima Noite'
	);
</script>

<PageHeader title={pageTitle}>
	{#if nextScheduleDate}
		<Button size="sm" onclick={() => (showQuickAdd = !showQuickAdd)}>
			{showQuickAdd ? 'Fechar' : '+ Adicionar'}
		</Button>
	{/if}
</PageHeader>

<div class="px-4 py-4">
	{#if !nextScheduleDate}
		<div class="flex flex-col items-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
				<Calendar class="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
			</div>
			<p class="font-medium">Nenhuma noite agendada</p>
			<p class="mt-1 text-sm text-muted-foreground">Crie uma escala para ver a próxima noite aqui</p>
		</div>
	{:else}
		<!-- Quick add modal -->
		{#if showQuickAdd}
			<div class="animate-in mb-4 rounded-2xl bg-card p-4 shadow-lg shadow-black/20 ring-1 ring-primary/20">
				<p class="mb-3 text-sm font-medium">Adicionar de última hora:</p>
				{#if availableToAdd.length === 0}
					<p class="text-sm text-muted-foreground">Todos já estão escalados</p>
				{:else}
					<div class="grid grid-cols-2 gap-2">
						{#each availableToAdd as collab (collab.id)}
							<button
								onclick={() => quickAssign(collab.id)}
								class="pressable flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm font-medium transition-all active:bg-accent"
							>
								<span class="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold">
									{collab.name.slice(0, 2).toUpperCase()}
								</span>
								{collab.name}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Total card -->
		<div class="animate-in mb-5 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent p-5 ring-1 ring-primary/20 shadow-lg shadow-primary/10">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total a repassar</div>
					<div class="mt-1 text-3xl font-bold text-gradient">{formatCurrency(totalToRepass)}</div>
				</div>
				<button
					onclick={() => (includeFixed = !includeFixed)}
					class="rounded-xl px-3 py-2 text-xs font-medium transition-all
						{includeFixed ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-muted text-muted-foreground'}"
				>
					{includeFixed ? 'Com fixos' : 'Sem fixos'}
				</button>
			</div>
		</div>

		<!-- Next night -->
		<div class="mb-5">
			<div class="mb-3 flex items-center gap-2">
				<Badge class="rounded-lg bg-primary/20 px-2.5 py-1 font-bold text-primary">
					{getDayName(nextScheduleDate.date).toUpperCase()}
				</Badge>
				<span class="font-semibold">{formatDate(nextScheduleDate.date)}</span>
				<Badge class="rounded-full font-bold {nextAssigned.length >= nextScheduleDate.required_count ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}">
					{nextAssigned.length}/{nextScheduleDate.required_count}
				</Badge>
			</div>

			<!-- Events on this date -->
			{#each nextEvents as evt (evt.id)}
				<div class="mb-3 rounded-2xl bg-gradient-to-br from-warning/15 to-transparent p-4 ring-1 ring-warning/20 shadow-md shadow-warning/10">
					<div class="flex items-center gap-2">
						<svg class="h-4 w-4 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12V7a2 2 0 012-2h10a2 2 0 012 2v5M3 12h18v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8z" /></svg>
						<span class="text-[10px] font-bold uppercase tracking-wider text-warning">Evento</span>
					</div>
					<div class="mt-1 font-semibold">{evt.name}</div>
					{#if evt.description}
						<p class="mt-0.5 text-xs text-muted-foreground">{evt.description}</p>
					{/if}
					<div class="mt-2 flex flex-wrap gap-2 text-[11px]">
						{#if evt.expected_attendees !== null}
							<Badge class="rounded-md bg-info/15 text-info">{evt.expected_attendees} pessoas</Badge>
						{/if}
						{#if evt.reserved_tables}
							<Badge class="rounded-md bg-muted text-foreground">Mesas: {evt.reserved_tables}</Badge>
						{/if}
					</div>
					{#if nextAssigned.length === 0}
						<a href="/dia" class="mt-3 block rounded-xl bg-warning/20 px-3 py-2 text-center text-xs font-medium text-warning ring-1 ring-warning/30">
							Ninguém escalado — escalar agora
						</a>
					{/if}
				</div>
			{/each}

			<!-- Assigned freelas -->
			<div class="stagger space-y-1.5">
				{#each nextAssigned as assignment (assignment.id)}
					{@const collab = collaborators.getById(assignment.collaborator_id)}
					{#if collab && !collab.fixed}
						{@const consumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid))}
						{@const effectiveRate = getEffectiveRate(assignment, collab.base_rate)}
						{@const hours = getHoursWorked(assignment.check_in, assignment.check_out)}
						<div class="rounded-2xl bg-card px-4 py-3 shadow-md shadow-black/10">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-muted to-accent text-sm font-bold">
									{collab.name.slice(0, 2).toUpperCase()}
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="font-medium">{collab.name}</span>
										{#if collab.stars > 0}<span class="text-xs text-star">{collab.stars}★</span>{/if}
									</div>
									<div class="text-xs text-muted-foreground">
										{formatCurrency(effectiveRate)}
										{#if hours !== null}
											<span class="text-info">({hours.toFixed(1)}h)</span>
										{/if}
										{#if consumed > 0}
											<span class="text-primary"> - {formatCurrency(consumed)} consumo</span>
										{/if}
									</div>
								</div>
								<a href="/consumo?person={collab.id}" class="rounded-lg bg-primary/15 p-2 text-primary transition-all active:scale-90" aria-label="Anotar consumo">
									<Plus class="h-4 w-4" />
								</a>
								<button
									onclick={() => removeAssignment(collab.id)}
									class="rounded-lg bg-muted p-2 text-muted-foreground transition-all active:scale-90 hover:text-primary"
									aria-label="Remover"
								>
									<X class="h-4 w-4" />
								</button>
							</div>
							<!-- Time tracking -->
							<div class="mt-2 flex items-center gap-2 border-t border-border pt-2">
								<span class="text-[10px] text-muted-foreground">Entrada</span>
								<input
									type="time"
									value={assignment.check_in ?? ''}
									onchange={(e) => setTime(assignment.id, 'check_in', e.currentTarget.value)}
									class="w-[5.5rem] rounded-lg bg-muted px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/50"
								/>
								<span class="text-[10px] text-muted-foreground">Saída</span>
								<input
									type="time"
									value={assignment.check_out ?? ''}
									onchange={(e) => setTime(assignment.id, 'check_out', e.currentTarget.value)}
									class="w-[5.5rem] rounded-lg bg-muted px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/50"
								/>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Following night -->
		{#if followingDate}
			<div class="mb-5">
				<div class="mb-3 flex items-center gap-2">
					<Badge class="rounded-lg bg-muted px-2.5 py-1 font-bold text-foreground">
						{getDayName(followingDate.date).toUpperCase()}
					</Badge>
					<span class="font-semibold">{formatDate(followingDate.date)}</span>
					<Badge class="rounded-full font-bold {followingAssigned.length >= followingDate.required_count ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}">
						{followingAssigned.length}/{followingDate.required_count}
					</Badge>
				</div>
				{#each followingEvents as evt (evt.id)}
					<div class="mb-2 rounded-xl bg-warning/10 px-3 py-2.5 ring-1 ring-warning/20">
						<div class="flex items-center gap-2">
							<span class="text-[10px] font-bold uppercase tracking-wider text-warning">Evento</span>
							<span class="text-sm font-medium">{evt.name}</span>
						</div>
						{#if evt.description}
							<p class="mt-0.5 text-xs text-muted-foreground">{evt.description}</p>
						{/if}
						<div class="mt-1 flex flex-wrap gap-1.5 text-[10px]">
							{#if evt.expected_attendees !== null}
								<span class="rounded bg-info/15 px-1.5 py-0.5 text-info">{evt.expected_attendees} pessoas</span>
							{/if}
							{#if evt.reserved_tables}
								<span class="rounded bg-muted px-1.5 py-0.5">Mesas: {evt.reserved_tables}</span>
							{/if}
						</div>
					</div>
				{/each}
				<div class="space-y-1.5">
					{#each followingAssigned as assignment (assignment.id)}
						{@const collab = collaborators.getById(assignment.collaborator_id)}
						{#if collab}
							<div class="flex items-center gap-3 rounded-xl bg-card px-4 py-2.5">
								<span class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
									{collab.name.slice(0, 2).toUpperCase()}
								</span>
								<span class="text-sm font-medium">{collab.name}</span>
								{#if collab.stars > 0}<span class="text-xs text-star">{collab.stars}★</span>{/if}
							</div>
						{/if}
					{/each}
					{#if followingAssigned.length === 0}
						<p class="rounded-xl bg-card px-4 py-3 text-center text-sm text-muted-foreground">Ninguém escalado ainda</p>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Fixed staff bar -->
		{#if allFixed.length > 0}
			<div class="rounded-2xl bg-info/10 p-4 ring-1 ring-info/20">
				<div class="mb-3 flex items-center justify-between">
					<span class="text-xs font-bold uppercase tracking-wider text-info">Equipe Fixa</span>
					<span class="text-xs text-muted-foreground">Presentes todos os dias</span>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each allFixed as collab (collab.id)}
						{@const consumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid))}
						<div class="flex items-center gap-2 rounded-xl bg-card/60 px-3 py-2">
							<span class="flex h-7 w-7 items-center justify-center rounded-full bg-info/20 text-xs font-bold text-info">
								{collab.name.slice(0, 2).toUpperCase()}
							</span>
							<div>
								<span class="text-sm font-medium">{collab.name}</span>
								{#if consumed > 0}
									<span class="ml-1 text-xs text-primary">{formatCurrency(consumed)}</span>
								{/if}
							</div>
							<a href="/consumo?person={collab.id}" class="rounded p-1 text-info/60 transition-all active:scale-90 hover:text-info" aria-label="Anotar consumo">
								<Plus class="h-3.5 w-3.5" strokeWidth={2.5} />
							</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
