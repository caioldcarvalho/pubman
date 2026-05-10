<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate, getDayName, todayISO } from '$lib/utils';

	// Multi-select toggles (default: freelas + ressarcimentos)
	let showFixos = $state(false);
	let showFreelas = $state(true);
	let showReimb = $state(true);

	// Recent days overview: last 5 scheduled days that had assignments
	const recentDays = $derived(() => {
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
				const assignments = schedule.getPastAssignments(collab.id, todayISO());
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
	let excluded = $state<Set<string>>(new Set());

	function toggleItem(id: string) {
		const next = new Set(excluded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		excluded = next;
	}

	const totalNet = $derived(
		allItems
			.filter((item) => !excluded.has(item.id))
			.reduce((sum, item) => sum + item.net, 0)
	);

	const includedItems = $derived(allItems.filter((item) => !excluded.has(item.id)));

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
		<button
			onclick={share}
			class="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-accent/20 transition-all active:scale-95"
		>
			Compartilhar
		</button>
	{/if}
</PageHeader>

<div class="px-4 py-4">
	<!-- Multi-toggle filters -->
	<div class="mb-4 flex flex-wrap gap-2">
		<button
			onclick={() => (showFixos = !showFixos)}
			class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
				{showFixos ? 'bg-info/20 text-info ring-1 ring-info/30' : 'bg-surface-2 text-text-muted'}"
		>Fixos</button>
		<button
			onclick={() => (showFreelas = !showFreelas)}
			class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
				{showFreelas ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-surface-2 text-text-muted'}"
		>Freelas</button>
		<button
			onclick={() => (showReimb = !showReimb)}
			class="rounded-xl px-3 py-1.5 text-sm font-medium transition-all
				{showReimb ? 'bg-warning/20 text-warning ring-1 ring-warning/30' : 'bg-surface-2 text-text-muted'}"
		>Ressarcimentos</button>
	</div>

	<!-- Recent days overview -->
	{#if recentDays().length > 0}
		<div class="mb-5">
			<h2 class="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Últimas noites</h2>
			<div class="space-y-1.5">
				{#each recentDays() as day}
					<div class="rounded-xl bg-surface px-3 py-2.5 shadow-sm shadow-black/5">
						<div class="mb-1 flex items-center gap-2">
							<span class="text-xs font-bold">{getDayName(day.date.date)}</span>
							<span class="text-xs text-text-muted">{formatDate(day.date.date)}</span>
							<span class="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold">{day.assigned.length}</span>
						</div>
						<div class="flex flex-wrap gap-1">
							{#each day.assigned as person}
								<a href="/colaboradores/{person.id}" class="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-surface-3">
									{person.name}
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if allItems.length === 0}
		<div class="flex flex-col items-center py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-2">
				<svg class="h-8 w-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 14a1 1 0 100 2 1 1 0 000-2z" />
				</svg>
			</div>
			<p class="text-sm text-text-muted">Nenhum pagamento pendente.</p>
			<p class="mt-1 text-xs text-text-muted">Escale colaboradores e registre consumo primeiro.</p>
		</div>
	{:else}
		<div class="animate-in mb-5 rounded-2xl bg-gradient-to-br from-accent/15 to-transparent p-5 text-center ring-1 ring-accent/20">
			<div class="text-xs font-medium uppercase tracking-wider text-text-muted">Total a pagar</div>
			<div class="mt-1 text-3xl font-bold text-gradient">{formatCurrency(totalNet)}</div>
			{#if excluded.size > 0}
				<div class="mt-1 text-xs text-text-muted">{excluded.size} item(ns) excluído(s)</div>
			{/if}
		</div>

		<div class="stagger space-y-2">
			{#each allItems as item}
				<div class="flex items-center gap-2 rounded-2xl bg-surface px-3 py-3.5 shadow-md shadow-black/10
					{excluded.has(item.id) ? 'opacity-40' : ''}">
					<!-- Checkbox -->
					<button
						onclick={() => toggleItem(item.id)}
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all
							{excluded.has(item.id) ? 'border-text-muted bg-surface-2' : 'border-accent bg-accent/15'}"
					>
						{#if !excluded.has(item.id)}
							<svg class="h-3 w-3 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5" /></svg>
						{/if}
					</button>

					<!-- Content -->
					<a href={item.href} class="pressable flex flex-1 items-center justify-between">
						<div>
							<div class="font-medium">{item.label}</div>
							<div class="mt-0.5 text-xs text-text-muted">{item.sublabel}</div>
						</div>
						<div class="flex items-center gap-2">
							<div class="rounded-lg px-2.5 py-1 text-right text-sm font-bold
								{item.type === 'reimb' ? 'bg-warning/15 text-warning' : item.net >= 0 ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}">
								{formatCurrency(item.net)}
							</div>
							<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" /></svg>
						</div>
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>
