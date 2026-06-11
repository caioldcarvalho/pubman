<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate, getDayName, todayISO } from '$lib/utils';
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Wallet from '@lucide/svelte/icons/wallet';

	// Selection state persists in localStorage; item marks only reset when a
	// filter bubble (Fixos/Freelas/Ressarcimentos) is clicked.
	const K_FILTERS = 'pagamentos.filters';
	const K_EXCLUDED = 'pagamentos.excluded';
	const K_NIGHTS = 'pagamentos.excludedNights';

	function loadJSON<T>(key: string, fallback: T): T {
		if (!browser) return fallback;
		try {
			const raw = localStorage.getItem(key);
			return raw ? (JSON.parse(raw) as T) : fallback;
		} catch {
			return fallback;
		}
	}

	function saveJSON(key: string, value: unknown) {
		if (browser) localStorage.setItem(key, JSON.stringify(value));
	}

	// Multi-select toggles (default: freelas + ressarcimentos)
	const savedFilters = loadJSON(K_FILTERS, { fixos: false, freelas: true, reimb: true });
	let showFixos = $state(savedFilters.fixos);
	let showFreelas = $state(savedFilters.freelas);
	let showReimb = $state(savedFilters.reimb);

	function toggleFilter(which: 'fixos' | 'freelas' | 'reimb') {
		if (which === 'fixos') showFixos = !showFixos;
		else if (which === 'freelas') showFreelas = !showFreelas;
		else showReimb = !showReimb;
		saveJSON(K_FILTERS, { fixos: showFixos, freelas: showFreelas, reimb: showReimb });
		// Clicking a bubble resets the item marks
		excluded = new Set();
		saveJSON(K_EXCLUDED, []);
	}

	// Which past nights count towards the totals (all by default)
	let excludedNights = $state<Set<string>>(new Set(loadJSON<string[]>(K_NIGHTS, [])));

	function toggleNight(dateId: string) {
		const next = new Set(excludedNights);
		if (next.has(dateId)) next.delete(dateId);
		else next.add(dateId);
		excludedNights = next;
		saveJSON(K_NIGHTS, [...next]);
	}

	// Recent days overview: last 5 scheduled days that had assignments
	const recentDays = $derived.by(() => {
		const today = todayISO();
		const pastDates = schedule.dates
			.filter((d) => d.date <= today)
			.sort((a, b) => b.date.localeCompare(a.date));

		const result: { date: typeof pastDates[0]; assigned: { name: string; id: string }[] }[] = [];
		for (const sd of pastDates) {
			const assignments = schedule.getAssignments(sd.id);
			if (assignments.length === 0) continue;
			const assigned = assignments.map((a) => {
				const c = collaborators.getById(a.collaborator_id);
				return { name: c?.name ?? '?', id: c?.id ?? '' };
			});
			result.push({ date: sd, assigned });
			if (result.length >= 5) break;
		}
		return result;
	});

	// Payment report items
	interface ReportItem {
		id: string;
		label: string;
		sublabel: string;
		net: number;
		type: 'collab' | 'reimb';
		href: string;
	}

	const collabReport = $derived(
		collaborators.active
			.filter((c) => {
				if (c.fixed && showFixos) return true;
				if (!c.fixed && showFreelas) return true;
				return false;
			})
			.map((collab) => {
				const assignments = schedule
					.getPastAssignments(collab.id, todayISO())
					.filter((a) => !excludedNights.has(a.date_id));
				const daysWorked = assignments.length;
				const earned = assignments.reduce((sum, a) => sum + (a.rate_override ?? collab.base_rate), 0);
				const consumed = consumption.totalByCollaborator(collab.id, (pid) => products.getPrice(pid));
				const reimbTotal = purchases.totalPendingByCollaborator(collab.id);
				return {
					id: collab.id,
					label: collab.name,
					sublabel: `${daysWorked} dia${daysWorked !== 1 ? 's' : ''} · consumo ${formatCurrency(consumed)}${reimbTotal > 0 ? ` · ressarc. ${formatCurrency(reimbTotal)}` : ''}`,
					net: earned - consumed + reimbTotal,
					type: 'collab' as const,
					href: `/pagamentos/${collab.id}`,
				};
			}).filter((r) => r.net !== 0)
	);

	// General reimbursements (no collaborator_id)
	const generalReimbs = $derived(
		showReimb
			? purchases.pending
					.filter((p) => p.collaborator_id !== null)
					// These are already included in collab lines above
					// Show only unattached reimbursements as separate items
					.length === 0
				? purchases.pending.filter((p) => p.collaborator_id === null).map((p) => ({
						id: `reimb-${p.id}`,
						label: p.notes || 'Ressarcimento',
						sublabel: formatDate(p.date),
						net: p.amount,
						type: 'reimb' as const,
						href: '/compras',
					}))
				: purchases.pending.filter((p) => p.collaborator_id === null).map((p) => ({
						id: `reimb-${p.id}`,
						label: p.notes || 'Ressarcimento',
						sublabel: formatDate(p.date),
						net: p.amount,
						type: 'reimb' as const,
						href: '/compras',
					}))
			: []
	);

	const allItems = $derived([...collabReport, ...generalReimbs]);

	// Checkboxes: track which items are included in the total
	let excluded = $state<Set<string>>(new Set(loadJSON<string[]>(K_EXCLUDED, [])));

	function toggleItem(id: string) {
		const next = new Set(excluded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		excluded = next;
		saveJSON(K_EXCLUDED, [...next]);
	}

	const totalNet = $derived(
		allItems
			.filter((item) => !excluded.has(item.id))
			.reduce((sum, item) => sum + item.net, 0)
	);

	const includedItems = $derived(allItems.filter((item) => !excluded.has(item.id)));

	const excludedNightsCount = $derived(
		recentDays.filter((d) => excludedNights.has(d.date.id)).length
	);

	function buildShareText(): string {
		const lines: string[] = ['💰 *Pagamentos*', ''];
		for (const item of includedItems) {
			const emoji = item.type === 'reimb' ? '📦' : '👤';
			lines.push(`${emoji} ${item.label}: ${formatCurrency(item.net)}`);
		}
		lines.push('', `*Total: ${formatCurrency(totalNet)}*`);
		return lines.join('\n');
	}

	async function share() {
		const text = buildShareText();
		if (navigator.share) {
			await navigator.share({ text });
		} else {
			await navigator.clipboard.writeText(text);
			toast.success('Copiado para a área de transferência');
		}
	}
</script>

<PageHeader title="Pagamentos">
	{#if allItems.length > 0}
		<Button size="sm" onclick={share}>Compartilhar</Button>
	{/if}
</PageHeader>

<div class="px-4 py-4">
	<!-- Multi-toggle filters -->
	<div class="mb-4 flex flex-wrap gap-2">
		<button
			onclick={() => toggleFilter('fixos')}
			class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
				{showFixos ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-muted text-muted-foreground'}"
		>Fixos</button>
		<button
			onclick={() => toggleFilter('freelas')}
			class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
				{showFreelas ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-muted text-muted-foreground'}"
		>Freelas</button>
		<button
			onclick={() => toggleFilter('reimb')}
			class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
				{showReimb ? 'bg-warning/20 text-warning ring-1 ring-warning/30' : 'bg-muted text-muted-foreground'}"
		>Ressarcimentos</button>
	</div>

	<!-- Recent days overview -->
	{#if recentDays.length > 0}
		<div class="mb-5">
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Últimas noites</h2>
				<span class="text-[10px] text-muted-foreground">desmarque para não contar</span>
			</div>
			<div class="space-y-1.5">
				{#each recentDays as day (day.date.id)}
					{@const nightExcluded = excludedNights.has(day.date.id)}
					<div class="flex items-start gap-2 rounded-xl bg-card px-3 py-2.5 shadow-sm shadow-black/5 {nightExcluded ? 'opacity-40' : ''}">
						<button
							onclick={() => toggleNight(day.date.id)}
							aria-label="{nightExcluded ? 'Incluir' : 'Excluir'} {formatDate(day.date.date)} do total"
							class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all
								{nightExcluded ? 'border-muted-foreground bg-muted' : 'border-primary bg-primary/15'}"
						>
							{#if !nightExcluded}
								<Check class="h-3 w-3 text-primary" strokeWidth={3} />
							{/if}
						</button>
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-center gap-2">
								<span class="text-xs font-bold">{getDayName(day.date.date)}</span>
								<span class="text-xs text-muted-foreground">{formatDate(day.date.date)}</span>
								<span class="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">{day.assigned.length}</span>
							</div>
							<div class="flex flex-wrap gap-1">
								{#each day.assigned as person (person.id)}
									<a href="/colaboradores/{person.id}" class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-accent">
										{person.name}
									</a>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if allItems.length === 0}
		<div class="flex flex-col items-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
				<Wallet class="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
			</div>
			<p class="text-sm text-muted-foreground">Nenhum pagamento pendente.</p>
			<p class="mt-1 text-xs text-muted-foreground">Escale colaboradores e registre consumo primeiro.</p>
		</div>
	{:else}
		<div class="animate-in mb-5 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent p-5 text-center ring-1 ring-primary/20">
			<div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total a pagar</div>
			<div class="mt-1 text-3xl font-bold text-gradient">{formatCurrency(totalNet)}</div>
			{#if excluded.size > 0}
				<div class="mt-1 text-xs text-muted-foreground">{excluded.size} item(ns) excluído(s)</div>
			{/if}
			{#if excludedNightsCount > 0}
				<div class="mt-0.5 text-xs text-muted-foreground">{excludedNightsCount} noite(s) fora da conta</div>
			{/if}
		</div>

		<div class="stagger space-y-2">
			{#each allItems as item (item.id)}
				<div class="flex items-center gap-2 rounded-2xl bg-card px-3 py-3.5 shadow-md shadow-black/10
					{excluded.has(item.id) ? 'opacity-40' : ''}">
					<!-- Checkbox -->
					<button
						onclick={() => toggleItem(item.id)}
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all
							{excluded.has(item.id) ? 'border-muted-foreground bg-muted' : 'border-primary bg-primary/15'}"
					>
						{#if !excluded.has(item.id)}
							<Check class="h-3 w-3 text-primary" strokeWidth={3} />
						{/if}
					</button>

					<!-- Content -->
					<a href={item.href} class="pressable flex flex-1 items-center justify-between">
						<div>
							<div class="font-medium">{item.label}</div>
							<div class="mt-0.5 text-xs text-muted-foreground">{item.sublabel}</div>
						</div>
						<div class="flex items-center gap-2">
							<div class="rounded-lg px-2.5 py-1 text-right text-sm font-bold
								{item.type === 'reimb' ? 'bg-warning/15 text-warning' : item.net >= 0 ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary'}">
								{formatCurrency(item.net)}
							</div>
							<ChevronRight class="h-4 w-4 text-muted-foreground" />
						</div>
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>
