<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { payments } from '$lib/stores/payments.svelte';
	import { collaborators, ALL_ROLES, type Role } from '$lib/stores/collaborators.svelte';
	import { consumption, entryValue } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { formatCurrency, formatDate, formatDateFull, getDayName, todayISO } from '$lib/utils';
	import { getEffectiveRate } from '$lib/shift';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Wallet from '@lucide/svelte/icons/wallet';

	const getPrice = (id: string) => products.getById(id)?.price ?? 0;

	// --- Filtros ---
	// Período: filtra pela data do pagamento (paid_at).
	let from = $state('');
	let to = $state('');

	// Categoria e função. Padrão: tudo incluído.
	let showFixos = $state(true);
	let showFreelas = $state(true);
	let showGerais = $state(true); // ressarcimentos sem colaborador
	let roleFilter = $state<Set<Role>>(new Set()); // vazio = todas as funções
	let workerId = $state(''); // '' = todos

	function toggleRole(r: Role) {
		const next = new Set(roleFilter);
		if (next.has(r)) next.delete(r);
		else next.add(r);
		roleFilter = next;
	}

	function isoDaysAgo(n: number): string {
		const d = new Date();
		d.setDate(d.getDate() - n);
		return d.toISOString().split('T')[0];
	}

	function isoMonthStart(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
	}

	function preset(kind: 'all' | '7' | '30' | 'month') {
		to = kind === 'all' ? '' : todayISO();
		from = kind === 'all' ? '' : kind === '7' ? isoDaysAgo(7) : kind === '30' ? isoDaysAgo(30) : isoMonthStart();
	}

	const activePreset = $derived.by(() => {
		if (!from && !to) return 'all';
		if (to === todayISO() && from === isoDaysAgo(7)) return '7';
		if (to === todayISO() && from === isoDaysAgo(30)) return '30';
		if (to === todayISO() && from === isoMonthStart()) return 'month';
		return 'custom';
	});

	// Colaboradores ordenados por nome para o seletor (inclui inativos: pagamentos
	// antigos podem ser de alguém que saiu).
	const workerOptions = $derived(
		[...collaborators.list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
	);

	function matches(p: (typeof payments.list)[number]): boolean {
		const day = p.paid_at.slice(0, 10);
		if (from && day < from) return false;
		if (to && day > to) return false;

		// Pagamento sem colaborador = ressarcimento geral.
		if (!p.collaborator_id) {
			if (workerId) return false;
			return showGerais;
		}

		if (workerId) return p.collaborator_id === workerId;

		const collab = collaborators.getById(p.collaborator_id);
		if (!collab) return showGerais; // colaborador removido: trata como avulso
		if (collab.fixed && !showFixos) return false;
		if (!collab.fixed && !showFreelas) return false;
		if (roleFilter.size > 0 && !collab.roles.some((r) => roleFilter.has(r))) return false;
		return true;
	}

	const filtered = $derived(payments.list.filter(matches));

	const totals = $derived(
		filtered.reduce(
			(acc, p) => {
				acc.net += p.net_amount;
				acc.earned += p.total_earned;
				acc.consumed += p.total_consumed;
				acc.reimbursed += p.total_reimbursed;
				return acc;
			},
			{ net: 0, earned: 0, consumed: 0, reimbursed: 0 }
		)
	);

	let expandedId = $state<string | null>(null);
	function toggle(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function labelFor(p: (typeof payments.list)[number]): string {
		if (!p.collaborator_id) return p.notes || 'Ressarcimento';
		return collaborators.getById(p.collaborator_id)?.name ?? 'Colaborador removido';
	}
</script>

<PageHeader title="Histórico" backHref="/pagamentos" />

<div class="px-4 py-4">
	<!-- Período -->
	<div class="mb-4">
		<div class="mb-2 flex flex-wrap gap-2">
			{#each [['all', 'Tudo'], ['7', '7 dias'], ['30', '30 dias'], ['month', 'Este mês']] as [kind, label] (kind)}
				<button
					onclick={() => preset(kind as 'all' | '7' | '30' | 'month')}
					class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
						{activePreset === kind ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
				>{label}</button>
			{/each}
		</div>
		<div class="flex items-center gap-2">
			<input
				type="date"
				bind:value={from}
				max={to || todayISO()}
				aria-label="Data inicial"
				class="flex-1 rounded-lg bg-muted px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/50"
			/>
			<span class="text-xs text-muted-foreground">até</span>
			<input
				type="date"
				bind:value={to}
				min={from || undefined}
				max={todayISO()}
				aria-label="Data final"
				class="flex-1 rounded-lg bg-muted px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/50"
			/>
		</div>
	</div>

	<!-- Categoria -->
	<div class="mb-2 flex flex-wrap gap-2">
		<button
			onclick={() => (showFixos = !showFixos)}
			class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
				{showFixos ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-muted text-muted-foreground'}"
		>Fixos</button>
		<button
			onclick={() => (showFreelas = !showFreelas)}
			class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
				{showFreelas ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
		>Freelas</button>
		<button
			onclick={() => (showGerais = !showGerais)}
			class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
				{showGerais ? 'bg-warning/20 text-warning ring-1 ring-warning/30' : 'bg-muted text-muted-foreground'}"
		>Gerais</button>
	</div>

	<!-- Função -->
	<div class="mb-2 flex flex-wrap gap-2">
		{#each ALL_ROLES as role (role.value)}
			{@const on = roleFilter.has(role.value)}
			<button
				onclick={() => toggleRole(role.value)}
				class="rounded-xl px-3 py-1 text-xs font-medium transition-all
					{on ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}"
			>{role.label}</button>
		{/each}
	</div>

	<!-- Trabalhador -->
	<div class="mb-4">
		<select
			bind:value={workerId}
			class="w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
		>
			<option value="">Todos os trabalhadores</option>
			{#each workerOptions as c (c.id)}
				<option value={c.id}>{c.name}{c.active ? '' : ' (inativo)'}</option>
			{/each}
		</select>
	</div>

	<!-- Resumo -->
	<div class="animate-in mb-5 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent p-4 ring-1 ring-primary/20">
		<div class="flex items-end justify-between">
			<div>
				<div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total pago</div>
				<div class="mt-0.5 text-3xl font-bold text-gradient">{formatCurrency(totals.net)}</div>
			</div>
			<div class="text-right text-xs text-muted-foreground">
				{filtered.length} pagamento{filtered.length !== 1 ? 's' : ''}
			</div>
		</div>
		<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
			<span>Ganhos <span class="font-semibold text-success">{formatCurrency(totals.earned)}</span></span>
			<span>Consumo <span class="font-semibold text-primary">{formatCurrency(totals.consumed)}</span></span>
			{#if totals.reimbursed > 0}
				<span>Ressarc. <span class="font-semibold text-warning">{formatCurrency(totals.reimbursed)}</span></span>
			{/if}
		</div>
	</div>

	<!-- Lista -->
	{#if filtered.length === 0}
		<div class="flex flex-col items-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
				<Wallet class="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
			</div>
			<p class="text-sm text-muted-foreground">Nenhum pagamento no filtro.</p>
		</div>
	{:else}
		<div class="stagger divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
			{#each filtered as pmt (pmt.id)}
				{@const expanded = expandedId === pmt.id}
				{@const pmtAssignments = schedule.getAssignmentsByPayment(pmt.id)}
				{@const pmtConsumption = consumption.getByPayment(pmt.id)}
				{@const pmtPurchases = purchases.getByPayment(pmt.id)}
				<div>
					<button
						onclick={() => toggle(pmt.id)}
						class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-muted"
					>
						<div class="min-w-0">
							<div class="truncate text-sm font-medium">{labelFor(pmt)}</div>
							<div class="mt-0.5 text-[11px] text-muted-foreground">
								{formatDateFull(pmt.paid_at.slice(0, 10))} · {formatCurrency(pmt.total_earned)} ganhos · {formatCurrency(pmt.total_consumed)} consumo{pmt.total_reimbursed > 0 ? ` · +${formatCurrency(pmt.total_reimbursed)} ressarc.` : ''}
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<span class="rounded-lg px-2.5 py-1 text-sm font-bold
								{pmt.net_amount >= 0 ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary'}">{formatCurrency(pmt.net_amount)}</span>
							<ChevronRight class="h-4 w-4 text-muted-foreground transition-transform {expanded ? 'rotate-90' : ''}" />
						</div>
					</button>
					{#if expanded}
						<div class="space-y-3 bg-muted/40 px-4 py-3 text-xs">
							{#if pmtAssignments.length > 0}
								<div>
									<div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dias pagos</div>
									{#each pmtAssignments as a (a.id)}
										{@const sd = schedule.getDateById(a.date_id)}
										{@const collab = pmt.collaborator_id ? collaborators.getById(pmt.collaborator_id) : null}
										<div class="flex justify-between py-0.5">
											<span>{sd ? `${getDayName(sd.date)} ${formatDate(sd.date)}` : 'dia removido'}</span>
											<span class="font-medium">{formatCurrency(getEffectiveRate(a.rate_override ?? collab?.base_rate ?? 0, sd?.day_of_week, a.check_in, a.check_out))}</span>
										</div>
									{/each}
								</div>
							{/if}
							{#if pmtConsumption.length > 0}
								<div>
									<div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Consumo descontado</div>
									{#each pmtConsumption as e (e.id)}
										{@const product = e.product_id ? products.getById(e.product_id) : null}
										{@const name = e.custom_name ?? product?.name ?? 'Produto removido'}
										<div class="flex justify-between py-0.5">
											<span>{name} <span class="text-muted-foreground">x{e.quantity}{#if e.split_count > 1} ÷{e.split_count}{/if} · {formatDate(e.date)}</span></span>
											<span class="font-medium text-primary">-{formatCurrency(entryValue(e, getPrice))}</span>
										</div>
									{/each}
								</div>
							{/if}
							{#if pmtPurchases.length > 0}
								<div>
									<div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ressarcimentos</div>
									{#each pmtPurchases as p (p.id)}
										<div class="flex justify-between py-0.5">
											<span>{p.notes || 'Ressarcimento'} <span class="text-muted-foreground">{formatDate(p.date)}</span></span>
											<span class="font-medium text-warning">+{formatCurrency(p.amount)}</span>
										</div>
									{/each}
								</div>
							{/if}
							{#if pmt.pix_key_used}
								<div class="text-[11px] text-muted-foreground">PIX: {pmt.pix_key_used}</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
