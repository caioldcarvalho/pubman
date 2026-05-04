<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { collaborators, COLLABORATOR_DISCOUNT } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate, getDayName, todayISO } from '$lib/utils';

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

	// Salao fixed staff
	const salaoFixed = $derived(
		collaborators.salaoStaff.filter((c) => c.fixed)
	);

	// Toggle to include fixed in total
	let includeFixed = $state(false);

	// Total to pay for next night's freelas
	const totalFreelas = $derived(
		nextAssigned.reduce((sum, a) => {
			const c = collaborators.getById(a.collaborator_id);
			if (!c || c.fixed) return sum;
			const earned = a.rate_override ?? c.base_rate;
			const consumed = consumption.totalByCollaborator(c.id, (pid) => products.getPrice(pid));
			return sum + earned - consumed;
		}, 0)
	);

	const totalFixed = $derived(
		salaoFixed.reduce((sum, c) => {
			const consumed = consumption.totalByCollaborator(c.id, (pid) => products.getPrice(pid));
			return sum + c.base_rate - consumed;
		}, 0)
	);

	const totalToRepass = $derived(includeFixed ? totalFreelas + totalFixed : totalFreelas);

	// Quick add: available salao freelancers not yet assigned
	let showQuickAdd = $state(false);
	const availableToAdd = $derived(
		nextScheduleDate
			? collaborators.salaoFreelancers.filter(
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
		<button
			onclick={() => (showQuickAdd = !showQuickAdd)}
			class="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-accent/20 transition-all active:scale-95"
		>
			{showQuickAdd ? 'Fechar' : '+ Adicionar'}
		</button>
	{/if}
</PageHeader>

<div class="px-4 py-4">
	{#if !nextScheduleDate}
		<div class="flex flex-col items-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-2">
				<svg class="h-8 w-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M6 2v2M18 2v2M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
				</svg>
			</div>
			<p class="font-medium">Nenhuma noite agendada</p>
			<p class="mt-1 text-sm text-text-muted">Crie uma escala para ver a próxima noite aqui</p>
		</div>
	{:else}
		<!-- Quick add modal -->
		{#if showQuickAdd}
			<div class="animate-in mb-4 rounded-2xl bg-surface p-4 shadow-lg shadow-black/20 ring-1 ring-accent/20">
				<p class="mb-3 text-sm font-medium">Adicionar de última hora:</p>
				{#if availableToAdd.length === 0}
					<p class="text-sm text-text-muted">Todos já estão escalados</p>
				{:else}
					<div class="grid grid-cols-2 gap-2">
						{#each availableToAdd as collab}
							<button
								onclick={() => quickAssign(collab.id)}
								class="pressable flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-medium transition-all active:bg-surface-3"
							>
								<span class="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-xs font-bold">
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
		<div class="animate-in mb-5 rounded-2xl bg-gradient-to-br from-accent/15 to-transparent p-5 ring-1 ring-accent/20 shadow-lg shadow-accent/10">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-xs font-bold uppercase tracking-wider text-text-muted">Total a repassar</div>
					<div class="mt-1 text-3xl font-bold text-gradient">{formatCurrency(totalToRepass)}</div>
				</div>
				<button
					onclick={() => (includeFixed = !includeFixed)}
					class="rounded-xl px-3 py-2 text-xs font-medium transition-all
						{includeFixed ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-surface-2 text-text-muted'}"
				>
					{includeFixed ? 'Com fixos' : 'Sem fixos'}
				</button>
			</div>
		</div>

		<!-- Next night -->
		<div class="mb-5">
			<div class="mb-3 flex items-center gap-2">
				<span class="rounded-lg bg-accent/20 px-2.5 py-1 text-xs font-bold text-accent">
					{getDayName(nextScheduleDate.date).toUpperCase()}
				</span>
				<span class="font-semibold">{formatDate(nextScheduleDate.date)}</span>
				<span class="rounded-full px-2 py-0.5 text-xs font-bold
					{nextAssigned.length >= nextScheduleDate.required_count ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}">
					{nextAssigned.length}/{nextScheduleDate.required_count}
				</span>
			</div>

			<!-- Assigned freelas -->
			<div class="stagger space-y-1.5">
				{#each nextAssigned as assignment}
					{@const collab = collaborators.getById(assignment.collaborator_id)}
					{#if collab && !collab.fixed}
						{@const consumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid))}
						<div class="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-md shadow-black/10">
							<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-surface-2 to-surface-3 text-sm font-bold">
								{collab.name.slice(0, 2).toUpperCase()}
							</div>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="font-medium">{collab.name}</span>
									<StarRating value={collab.stars} size="sm" readonly />
								</div>
								<div class="text-xs text-text-muted">
									{formatCurrency(assignment.rate_override ?? collab.base_rate)}
									{#if consumed > 0}
										<span class="text-accent"> - {formatCurrency(consumed)} consumo</span>
									{/if}
								</div>
							</div>
							<a href="/consumo?person={collab.id}" class="rounded-lg bg-accent-soft p-2 text-accent transition-all active:scale-90" aria-label="Anotar consumo">
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
							</a>
							<button
								onclick={() => removeAssignment(collab.id)}
								class="rounded-lg bg-surface-2 p-2 text-text-muted transition-all active:scale-90 hover:text-accent"
								aria-label="Remover"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
							</button>
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Following night -->
		{#if followingDate}
			<div class="mb-5">
				<div class="mb-3 flex items-center gap-2">
					<span class="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold">
						{getDayName(followingDate.date).toUpperCase()}
					</span>
					<span class="font-semibold">{formatDate(followingDate.date)}</span>
					<span class="rounded-full px-2 py-0.5 text-xs font-bold
						{followingAssigned.length >= followingDate.required_count ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}">
						{followingAssigned.length}/{followingDate.required_count}
					</span>
				</div>
				<div class="space-y-1.5">
					{#each followingAssigned as assignment}
						{@const collab = collaborators.getById(assignment.collaborator_id)}
						{#if collab}
							<div class="flex items-center gap-3 rounded-xl bg-surface px-4 py-2.5">
								<span class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
									{collab.name.slice(0, 2).toUpperCase()}
								</span>
								<span class="text-sm font-medium">{collab.name}</span>
								<StarRating value={collab.stars} size="sm" readonly />
							</div>
						{/if}
					{/each}
					{#if followingAssigned.length === 0}
						<p class="rounded-xl bg-surface px-4 py-3 text-center text-sm text-text-muted">Ninguém escalado ainda</p>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Fixed staff bar -->
		{#if salaoFixed.length > 0}
			<div class="rounded-2xl bg-info/10 p-4 ring-1 ring-info/20">
				<div class="mb-3 flex items-center justify-between">
					<span class="text-xs font-bold uppercase tracking-wider text-info">Equipe Fixa</span>
					<span class="text-xs text-text-muted">Presentes todos os dias</span>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each salaoFixed as collab}
						{@const consumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid))}
						<div class="flex items-center gap-2 rounded-xl bg-surface/60 px-3 py-2">
							<span class="flex h-7 w-7 items-center justify-center rounded-full bg-info/20 text-xs font-bold text-info">
								{collab.name.slice(0, 2).toUpperCase()}
							</span>
							<div>
								<span class="text-sm font-medium">{collab.name}</span>
								{#if consumed > 0}
									<span class="ml-1 text-xs text-accent">{formatCurrency(consumed)}</span>
								{/if}
							</div>
							<a href="/consumo?person={collab.id}" class="rounded p-1 text-info/60 transition-all active:scale-90 hover:text-info" aria-label="Anotar consumo">
								<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
							</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
