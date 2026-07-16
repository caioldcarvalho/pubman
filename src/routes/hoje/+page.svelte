<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';

	import { collaborators, COLLABORATOR_DISCOUNT, type Collaborator } from '$lib/stores/collaborators.svelte';
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
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	const todayStr = todayISO();

	// A semana do pub vai de TERÇA a DOMINGO (segunda é folga). Dado hoje,
	// devolve as 6 datas ISO da semana corrente (na segunda mostramos a semana
	// que começa amanhã).
	function weekDates(anchor: string): string[] {
		const today = new Date(anchor + 'T12:00:00');
		const dow = today.getDay(); // 0=dom ... 6=sáb
		const offset = dow === 1 ? -1 : (dow - 2 + 7) % 7; // dias desde a terça
		const start = new Date(today);
		start.setDate(today.getDate() - offset);
		return Array.from({ length: 6 }, (_, i) => {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			return d.toISOString().split('T')[0];
		});
	}

	// Visão da semana: cada dia com seus titulares, backups e eventos.
	const weekDays = $derived(
		weekDates(todayStr).map((date) => {
			const sd = schedule.dates.find((d) => d.date === date) ?? null;
			return {
				date,
				scheduleDate: sd,
				titulares: sd ? schedule.getTitulares(sd.id) : [],
				backups: sd ? schedule.getBackups(sd.id) : [],
				events: sd ? events.getByDateId(sd.id) : [],
				isToday: date === todayStr,
				isPast: date < todayStr,
			};
		})
	);

	// Cada dia é colapsável; hoje já começa aberto.
	let expanded = $state<Record<string, boolean>>({ [todayStr]: true });
	function toggleDay(date: string) {
		expanded[date] = !expanded[date];
	}

	// Tag de área do colaborador (cozinha = fundo; resto = salão/frente).
	function roleTag(c: Collaborator): { label: string; cls: string } {
		return c.roles.includes('cozinha')
			? { label: 'Cozinha', cls: 'bg-warning/15 text-warning' }
			: { label: 'Salão', cls: 'bg-info/15 text-info' };
	}

	// The page is always anchored on TODAY, scheduled or not
	const todayScheduleDate = $derived(
		schedule.dates.find((d) => d.date === todayStr) ?? null
	);

	// Titulares (contam no total/cota); backups ficam de prontidão à parte.
	const todayAssigned = $derived(
		todayScheduleDate ? schedule.getTitulares(todayScheduleDate.id) : []
	);
	// All fixed staff
	const allFixed = $derived(collaborators.fixedStaff);

	// Toggle to include fixed in total
	let includeFixed = $state(false);

	// Total to pay for tonight's freelas
	const totalFreelas = $derived(
		todayAssigned.reduce((sum, a) => {
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
		collaborators.freelancers.filter(
			(c) => !todayScheduleDate || schedule.getAssignmentState(todayScheduleDate.id, c.id) === 'none'
		)
	);

	// Backup chamado hoje: promove a titular (passa a contar e a ser pago).
	async function promoteBackup(dateId: string, collabId: string) {
		await schedule.setAssignment(dateId, collabId, 'titular');
		const name = collaborators.getById(collabId)?.name ?? '';
		toast.success(`${name} chamado (agora titular)`);
	}

	async function quickAssign(collabId: string) {
		// Creates today's schedule_date on demand if today isn't scheduled yet
		const sd = await schedule.getOrCreateDate(todayStr);
		await schedule.toggleAssignment(sd.id, collabId);
		const name = collaborators.getById(collabId)?.name ?? '';
		toast.success(`${name} adicionado`);
		showQuickAdd = false;
	}

	async function removeAssignment(collabId: string) {
		if (!todayScheduleDate) return;
		await schedule.toggleAssignment(todayScheduleDate.id, collabId);
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
		const a = todayAssigned.find((x) => x.id === assignmentId);
		if (!a) return;
		const checkIn = field === 'check_in' ? (value || null) : a.check_in;
		const checkOut = field === 'check_out' ? (value || null) : a.check_out;
		await schedule.updateAssignmentTimes(assignmentId, checkIn, checkOut);
	}

</script>

<PageHeader title="Hoje">
	<Button size="sm" onclick={() => (showQuickAdd = !showQuickAdd)}>
		{showQuickAdd ? 'Fechar' : '+ Adicionar'}
	</Button>
</PageHeader>

<div class="px-4 py-4">
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

		<!-- Semana (terça → domingo) -->
		<div class="mb-5 space-y-2">
			<div class="mb-1 flex items-center justify-between">
				<h2 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Escala da semana</h2>
				<span class="flex items-center gap-2.5 text-[10px] text-muted-foreground">
					<span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-info"></span>Salão</span>
					<span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-warning"></span>Cozinha</span>
				</span>
			</div>

			{#each weekDays as day (day.date)}
				{@const isOpen = expanded[day.date] ?? false}
				<div class="overflow-hidden rounded-2xl {day.isToday ? 'bg-gradient-to-br from-primary/10 to-transparent shadow-lg shadow-primary/10 ring-1 ring-primary/30' : 'bg-card ring-1 ring-border'} {day.isPast && !day.isToday ? 'opacity-80' : ''}">
					<!-- Cabeçalho (toque para abrir/fechar) -->
					<button
						onclick={() => toggleDay(day.date)}
						class="pressable flex w-full items-center gap-2 px-4 py-3 text-left"
					>
						<Badge class="rounded-lg px-2.5 py-1 font-bold {day.isToday ? 'bg-primary/25 text-primary' : 'bg-muted text-foreground'}">
							{getDayName(day.date).toUpperCase()}
						</Badge>
						<span class="text-sm font-semibold {day.isToday ? '' : 'text-muted-foreground'}">{formatDate(day.date)}</span>
						{#if day.isToday}
							<span class="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Hoje</span>
						{/if}
						<div class="ml-auto flex items-center gap-2">
							{#if day.scheduleDate}
								<Badge class="rounded-full font-bold {day.titulares.length >= day.scheduleDate.required_count ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}">
									{day.titulares.length}/{day.scheduleDate.required_count}
								</Badge>
							{:else}
								<span class="text-xs text-muted-foreground">—</span>
							{/if}
							<ChevronDown class="h-4 w-4 text-muted-foreground transition-transform {isOpen ? 'rotate-180' : ''}" />
						</div>
					</button>

					<!-- Resumo (chips) quando fechado -->
					{#if !isOpen}
						<div class="flex flex-wrap gap-1.5 px-4 pb-3">
							{#if day.titulares.length === 0}
								<span class="text-xs text-muted-foreground">Ninguém escalado</span>
							{:else}
								{#each day.titulares as a (a.id)}
									{@const c = collaborators.getById(a.collaborator_id)}
									{#if c}
										{@const tag = roleTag(c)}
										<span class="rounded-full px-2.5 py-1 text-xs font-medium {tag.cls}">{c.name}</span>
									{/if}
								{/each}
								{#if day.backups.length > 0}
									<span class="rounded-full border border-dashed border-warning/50 px-2.5 py-1 text-xs text-warning">+{day.backups.length} backup</span>
								{/if}
							{/if}
						</div>
					{/if}

					<!-- Detalhe quando aberto -->
					{#if isOpen}
						<div class="border-t border-border/60 px-4 py-3">
							<!-- Eventos do dia -->
							{#each day.events as evt (evt.id)}
								<div class="mb-3 rounded-xl bg-warning/10 px-3 py-2.5 ring-1 ring-warning/20">
									<div class="flex items-center gap-2">
										<span class="text-[10px] font-bold uppercase tracking-wider text-warning">Evento</span>
										<span class="text-sm font-medium">{evt.name}</span>
									</div>
									{#if evt.description}<p class="mt-0.5 text-xs text-muted-foreground">{evt.description}</p>{/if}
									<div class="mt-1 flex flex-wrap gap-1.5 text-[10px]">
										{#if evt.expected_attendees !== null}<span class="rounded bg-info/15 px-1.5 py-0.5 text-info">{evt.expected_attendees} pessoas</span>{/if}
										{#if evt.reserved_tables}<span class="rounded bg-muted px-1.5 py-0.5">Mesas: {evt.reserved_tables}</span>{/if}
									</div>
								</div>
							{/each}

							{#if day.titulares.length === 0}
								<div class="flex flex-col items-center rounded-xl bg-card/50 py-6 text-center">
									<Calendar class="mb-2 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
									<p class="text-sm font-medium">Ninguém escalado</p>
									{#if day.isToday}
										<p class="mt-1 text-xs text-muted-foreground">Use "+ Adicionar" para escalar de última hora</p>
									{/if}
								</div>
							{/if}

							<div class="stagger space-y-1.5">
								{#each day.titulares as assignment (assignment.id)}
									{@const collab = collaborators.getById(assignment.collaborator_id)}
									{#if collab}
										{@const tag = roleTag(collab)}
										{@const consumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid))}
										{@const effectiveRate = getEffectiveRate(assignment, collab.base_rate)}
										{@const hours = getHoursWorked(assignment.check_in, assignment.check_out)}
										{#if day.isToday}
											<!-- Card interativo (hoje): consumo, ponto, remover -->
											<div class="rounded-2xl bg-card px-4 py-3 shadow-md shadow-black/10">
												<div class="flex items-center gap-3">
													<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-muted to-accent text-sm font-bold">
														{collab.name.slice(0, 2).toUpperCase()}
													</div>
													<div class="flex-1">
														<div class="flex items-center gap-2">
															<span class="font-medium">{collab.name}</span>
															<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium {tag.cls}">{tag.label}</span>
															{#if collab.stars > 0}<span class="text-xs text-star">{collab.stars}★</span>{/if}
														</div>
														<div class="text-xs text-muted-foreground">
															{formatCurrency(effectiveRate)}
															{#if hours !== null}<span class="text-info">({hours.toFixed(1)}h)</span>{/if}
															{#if consumed > 0}<span class="text-primary"> - {formatCurrency(consumed)} consumo</span>{/if}
														</div>
													</div>
													<a href="/consumo?person={collab.id}" class="rounded-lg bg-primary/15 p-2 text-primary transition-all active:scale-90" aria-label="Anotar consumo">
														<Plus class="h-4 w-4" />
													</a>
													{#if !collab.fixed}
														<button
															onclick={() => removeAssignment(collab.id)}
															class="rounded-lg bg-muted p-2 text-muted-foreground transition-all active:scale-90 hover:text-primary"
															aria-label="Remover"
														>
															<X class="h-4 w-4" />
														</button>
													{/if}
												</div>
												<!-- Ponto -->
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
										{:else}
											<!-- Linha resumida (outros dias) -->
											<div class="flex items-center gap-3 rounded-xl bg-card/60 px-3 py-2.5">
												<span class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">{collab.name.slice(0, 2).toUpperCase()}</span>
												<div class="flex-1">
													<div class="flex items-center gap-2">
														<span class="text-sm font-medium">{collab.name}</span>
														<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium {tag.cls}">{tag.label}</span>
														{#if collab.stars > 0}<span class="text-xs text-star">{collab.stars}★</span>{/if}
													</div>
													<div class="text-xs text-muted-foreground">
														{formatCurrency(effectiveRate)}
														{#if consumed > 0}<span class="text-primary"> - {formatCurrency(consumed)} consumo</span>{/if}
													</div>
												</div>
												<a href="/consumo?person={collab.id}" class="rounded-lg bg-primary/10 p-1.5 text-primary transition-all active:scale-90" aria-label="Anotar consumo">
													<Plus class="h-3.5 w-3.5" />
												</a>
											</div>
										{/if}
									{/if}
								{/each}
							</div>

							<!-- Backups -->
							{#if day.backups.length > 0}
								<div class="mt-3">
									<div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-warning">
										{day.isToday ? 'Backup · prontidão — toque para chamar' : 'Backup · prontidão'}
									</div>
									<div class="flex flex-wrap gap-1.5">
										{#each day.backups as b (b.id)}
											{@const c = collaborators.getById(b.collaborator_id)}
											{#if c}
												{#if day.isToday}
													<button
														onclick={() => promoteBackup(b.date_id, c.id)}
														class="pressable rounded-full border border-dashed border-warning/60 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning"
													>
														{c.name}
													</button>
												{:else}
													<span class="rounded-full border border-dashed border-warning/60 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">{c.name}</span>
												{/if}
											{/if}
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>

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
</div>
