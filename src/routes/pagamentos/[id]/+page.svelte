<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption, entryValue } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { payments } from '$lib/stores/payments.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatCurrency, formatDate, getDayName, todayISO } from '$lib/utils';
	import { buildPixBRCode, normalizePixKey } from '$lib/pix';

	const collab = $derived(collaborators.getById(page.params.id));

	const assignments = $derived(
		collab ? schedule.getPastAssignments(collab.id, todayISO()) : []
	);

	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);

	const reimbursements = $derived(
		collab ? purchases.pendingByCollaborator(collab.id) : []
	);

	const totalEarned = $derived(
		collab ? assignments.reduce((sum, a) => sum + (a.rate_override ?? collab.base_rate), 0) : 0
	);

	const DISCOUNT = 0.20;
	const getPrice = (id: string) => products.getById(id)?.price ?? 0;
	const totalConsumed = $derived(
		entries.reduce((sum, e) => sum + entryValue(e, getPrice), 0)
	);

	const totalReimbursed = $derived(
		reimbursements.reduce((sum, p) => sum + p.amount, 0)
	);

	const net = $derived(totalEarned - totalConsumed + totalReimbursed);

	async function setRateOverride(assignmentId: string, value: string) {
		const numVal = parseFloat(value);
		await schedule.updateAssignmentRate(assignmentId, isNaN(numVal) ? null : numVal);
	}

	async function markPaid() {
		if (!collab) return;
		const payment = await payments.create({
			collaborator_id: collab.id,
			total_earned: totalEarned,
			total_consumed: totalConsumed,
			total_reimbursed: totalReimbursed,
			net_amount: net,
			pix_key_used: collab.pix_key ?? null,
		});
		if (!payment) {
			toast.error('Erro ao registrar pagamento');
			return;
		}
		await Promise.all([
			schedule.settleAssignmentsForCollaborator(collab.id, payment.id, todayISO()),
			consumption.settleByCollaborator(collab.id, payment.id),
			purchases.settleByCollaborator(collab.id, payment.id),
		]);
		toast.success(`Pagamento de ${collab.name} finalizado`);
		goto('/pagamentos');
	}

	function getDateForAssignment(assignment: { date_id: string }): string {
		return schedule.getDateById(assignment.date_id)?.date ?? '';
	}

	function pixCode(): string | null {
		if (!collab?.pix_key || net <= 0) return null;
		return buildPixBRCode({
			pixKey: collab.pix_key,
			amount: net,
			merchantName: collab.name,
		});
	}

	async function copyPixCode() {
		const code = pixCode();
		if (!code) return;
		try {
			await navigator.clipboard.writeText(code);
			toast.success('Código PIX copiado');
		} catch {
			toast.error('Não foi possível copiar');
		}
	}

	async function copyPixKey() {
		if (!collab?.pix_key) return;
		try {
			await navigator.clipboard.writeText(normalizePixKey(collab.pix_key));
			toast.success('Chave PIX copiada');
		} catch {
			toast.error('Não foi possível copiar');
		}
	}

	async function sharePixCode() {
		const code = pixCode();
		if (!code) return;
		if (navigator.share) {
			try {
				await navigator.share({ text: code });
			} catch {
				// usuário cancelou — silêncio
			}
		} else {
			await copyPixCode();
		}
	}

	let pixKeyDraft = $state('');
	let savingPix = $state(false);

	async function savePixKey() {
		if (!collab) return;
		const trimmed = pixKeyDraft.trim();
		if (!trimmed) return;
		savingPix = true;
		await collaborators.update(collab.id, { pix_key: trimmed });
		savingPix = false;
		pixKeyDraft = '';
		toast.success('Chave PIX salva');
	}
</script>

{#if collab}
	<PageHeader title={collab.name} backHref="/pagamentos" />

	<div class="px-4 py-4">
		<!-- Summary -->
		<div class="animate-in mb-5 grid grid-cols-3 gap-2">
			<div class="rounded-2xl bg-surface p-3 text-center shadow-md shadow-black/10">
				<div class="text-lg font-bold text-success">{formatCurrency(totalEarned)}</div>
				<div class="text-[10px] font-medium uppercase tracking-wider text-text-muted">Ganhou</div>
			</div>
			<div class="rounded-2xl bg-surface p-3 text-center shadow-md shadow-black/10">
				<div class="text-lg font-bold text-accent">{formatCurrency(totalConsumed)}</div>
				<div class="text-[10px] font-medium uppercase tracking-wider text-text-muted">Consumiu</div>
			</div>
			<div class="rounded-2xl p-3 text-center shadow-md shadow-black/10
				{net >= 0 ? 'bg-success/10 ring-1 ring-success/20' : 'bg-accent/10 ring-1 ring-accent/20'}">
				<div class="text-lg font-bold {net >= 0 ? 'text-success' : 'text-accent'}">{formatCurrency(net)}</div>
				<div class="text-[10px] font-medium uppercase tracking-wider text-text-muted">Líquido</div>
			</div>
		</div>

		{#if totalReimbursed > 0}
			<div class="mb-4 flex items-center justify-between rounded-xl bg-warning/10 px-3 py-2 ring-1 ring-warning/20">
				<span class="text-xs font-medium text-warning">Ressarcimentos inclusos</span>
				<span class="text-sm font-bold text-warning">+{formatCurrency(totalReimbursed)}</span>
			</div>
		{/if}

		<!-- Days worked -->
		<h2 class="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">Dias trabalhados</h2>
		{#if assignments.length === 0}
			<p class="mb-5 text-sm text-text-muted">Nenhum dia registrado</p>
		{:else}
			<div class="stagger mb-5 divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each assignments as assignment}
					{@const dateStr = getDateForAssignment(assignment)}
					<div class="flex items-center justify-between px-4 py-3">
						<div class="text-sm">
							<span class="font-medium">{getDayName(dateStr)}</span>
							<span class="text-text-muted"> {formatDate(dateStr)}</span>
						</div>
						<input
							type="number"
							value={assignment.rate_override ?? collab.base_rate}
							onchange={(e) => setRateOverride(assignment.id, e.currentTarget.value)}
							class="w-24 rounded-xl bg-surface-2 px-3 py-1.5 text-right text-sm font-medium outline-none transition-shadow focus:ring-2 focus:ring-accent/50"
						/>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Consumption -->
		<h2 class="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">Consumo</h2>
		{#if entries.length === 0}
			<p class="mb-5 text-sm text-text-muted">Nenhum consumo</p>
		{:else}
			<div class="stagger mb-5 divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each entries as entry}
					{@const product = entry.product_id ? products.getById(entry.product_id) : null}
					{@const name = entry.custom_name ?? product?.name ?? '?'}
					<div class="flex items-center justify-between px-4 py-3">
						<div class="text-sm">{name} <span class="text-text-muted">x{entry.quantity}{#if entry.split_count > 1} ÷{entry.split_count}{/if}</span></div>
						<span class="text-sm font-medium text-accent">{formatCurrency(entryValue(entry, getPrice))}</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Reimbursements -->
		{#if reimbursements.length > 0}
			<h2 class="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">Ressarcimentos</h2>
			<div class="stagger mb-5 divide-y divide-surface-2 rounded-2xl bg-surface shadow-md shadow-black/10">
				{#each reimbursements as r}
					<div class="flex items-center justify-between px-4 py-3">
						<div class="text-sm">
							<span class="font-medium">{r.notes || 'Ressarcimento'}</span>
							<span class="text-text-muted"> {formatDate(r.date)}</span>
						</div>
						<span class="text-sm font-medium text-warning">+{formatCurrency(r.amount)}</span>
					</div>
				{/each}
			</div>
		{/if}

		{#if net > 0}
			{#if collab.pix_key}
				<div class="mb-2 flex gap-2">
					<button
						onclick={copyPixCode}
						class="pressable flex-[3] rounded-2xl bg-info py-3.5 text-center font-semibold text-white shadow-lg shadow-info/20 transition-all"
					>
						Copiar PIX ({formatCurrency(net)})
					</button>
					<button
						onclick={sharePixCode}
						aria-label="Abrir em app de banco"
						class="pressable flex flex-1 items-center justify-center rounded-2xl bg-info/20 text-info ring-1 ring-info/30 transition-all"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" />
							<polyline points="16 6 12 2 8 6" />
							<line x1="12" y1="2" x2="12" y2="15" />
						</svg>
					</button>
				</div>
				<button
					onclick={copyPixKey}
					class="mb-3 mx-auto flex items-center gap-1.5 text-[11px] text-text-muted transition-colors active:text-info"
				>
					<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
					</svg>
					Chave: {collab.pix_key} <span class="text-info">(toque p/ copiar)</span>
				</button>
			{:else}
				<div class="mb-3 rounded-2xl bg-surface p-3 ring-1 ring-info/20">
					<p class="mb-2 text-xs text-text-muted">Sem chave PIX cadastrada</p>
					<div class="flex gap-2">
						<input
							bind:value={pixKeyDraft}
							placeholder="CPF, e-mail, telefone..."
							class="flex-1 rounded-xl bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-info/50"
						/>
						<button
							onclick={savePixKey}
							disabled={savingPix || !pixKeyDraft.trim()}
							class="rounded-xl bg-info px-4 py-2 text-sm font-medium text-white shadow-md shadow-info/20 transition-all active:scale-95 disabled:opacity-50"
						>Salvar</button>
					</div>
				</div>
			{/if}
		{/if}

		<button
			onclick={markPaid}
			class="pressable w-full rounded-2xl bg-success py-3.5 text-center font-semibold text-bg shadow-lg shadow-success/20 transition-all"
		>
			Marcar como Pago
		</button>
	</div>
{:else}
	<PageHeader title="Não encontrado" backHref="/pagamentos" />
{/if}
