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
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Copy from '@lucide/svelte/icons/copy';
	import Share from '@lucide/svelte/icons/share';

	const collab = $derived(collaborators.getById(page.params.id!));

	const assignments = $derived(
		collab ? schedule.getPastAssignments(collab.id, todayISO()) : []
	);

	// Dias desmarcados ficam de fora deste pagamento (continuam pendentes).
	// Guardamos os excluídos: assim todo dia novo já entra selecionado por padrão.
	let deselectedDays = $state<Set<string>>(new Set());

	function toggleDay(id: string) {
		const next = new Set(deselectedDays);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		deselectedDays = next;
	}

	const selectedAssignments = $derived(
		assignments.filter((a) => !deselectedDays.has(a.id))
	);

	const entries = $derived(collab ? consumption.getByCollaborator(collab.id) : []);

	// Data de corte: o consumo até o último dia trabalhado que está sendo pago entra
	// neste pagamento; o que veio depois pertence ao próximo. Sem dias selecionados
	// (pagamento só de consumo) o corte é hoje, incluindo tudo o que está pendente.
	const cutoffDate = $derived.by(() => {
		const dates = selectedAssignments
			.map((a) => getDateForAssignment(a))
			.filter((d) => d !== '');
		if (dates.length === 0) return todayISO();
		return dates.reduce((max, d) => (d > max ? d : max), dates[0]);
	});

	// Escolhas manuais sobrescrevem o corte automático (válvula de escape).
	let manualConsumption = $state<Map<string, boolean>>(new Map());

	function isEntryIncluded(entry: { id: string; date: string }): boolean {
		const manual = manualConsumption.get(entry.id);
		if (manual !== undefined) return manual;
		return entry.date <= cutoffDate;
	}

	function toggleEntry(entry: { id: string; date: string }) {
		const next = new Map(manualConsumption);
		next.set(entry.id, !isEntryIncluded(entry));
		manualConsumption = next;
	}

	const includedEntries = $derived(entries.filter((e) => isEntryIncluded(e)));

	const reimbursements = $derived(
		collab ? purchases.pendingByCollaborator(collab.id) : []
	);

	const totalEarned = $derived(
		collab ? selectedAssignments.reduce((sum, a) => sum + (a.rate_override ?? collab.base_rate), 0) : 0
	);

	const getPrice = (id: string) => products.getById(id)?.price ?? 0;
	const totalConsumed = $derived(
		includedEntries.reduce((sum, e) => sum + entryValue(e, getPrice), 0)
	);

	const totalReimbursed = $derived(
		reimbursements.reduce((sum, p) => sum + p.amount, 0)
	);

	const net = $derived(totalEarned - totalConsumed + totalReimbursed);

	async function setRateOverride(assignmentId: string, value: string) {
		if (value.trim() === '') {
			await schedule.updateAssignmentRate(assignmentId, null);
			return;
		}
		const numVal = parseFloat(value.replace(',', '.'));
		if (!Number.isFinite(numVal) || numVal < 0 || numVal > 1_000_000) {
			toast.error('Valor inválido');
			return;
		}
		await schedule.updateAssignmentRate(assignmentId, numVal);
	}

	const hasSomethingToPay = $derived(
		selectedAssignments.length > 0 || includedEntries.length > 0 || reimbursements.length > 0
	);

	async function markPaid() {
		if (!collab || !hasSomethingToPay) return;
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
			schedule.settleAssignmentsByIds(selectedAssignments.map((a) => a.id), payment.id),
			consumption.settleByIds(includedEntries.map((e) => e.id), payment.id),
			purchases.settleByCollaborator(collab.id, payment.id),
		]);
		const leftover = assignments.length - selectedAssignments.length;
		toast.success(
			leftover > 0
				? `Pagamento parcial de ${collab.name} (${leftover} dia${leftover !== 1 ? 's' : ''} pendente${leftover !== 1 ? 's' : ''})`
				: `Pagamento de ${collab.name} finalizado`
		);
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
		await collaborators.update(collab.id, { pix_key: normalizePixKey(trimmed) });
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
			<div class="rounded-2xl bg-card p-3 text-center shadow-md shadow-black/10">
				<div class="text-lg font-bold text-success">{formatCurrency(totalEarned)}</div>
				<div class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ganhou</div>
			</div>
			<div class="rounded-2xl bg-card p-3 text-center shadow-md shadow-black/10">
				<div class="text-lg font-bold text-primary">{formatCurrency(totalConsumed)}</div>
				<div class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Consumiu</div>
			</div>
			<div class="rounded-2xl p-3 text-center shadow-md shadow-black/10
				{net >= 0 ? 'bg-success/10 ring-1 ring-success/20' : 'bg-primary/10 ring-1 ring-primary/20'}">
				<div class="text-lg font-bold {net >= 0 ? 'text-success' : 'text-primary'}">{formatCurrency(net)}</div>
				<div class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Líquido</div>
			</div>
		</div>

		{#if totalReimbursed > 0}
			<div class="mb-4 flex items-center justify-between rounded-xl bg-warning/10 px-3 py-2 ring-1 ring-warning/20">
				<span class="text-xs font-medium text-warning">Ressarcimentos inclusos</span>
				<span class="text-sm font-bold text-warning">+{formatCurrency(totalReimbursed)}</span>
			</div>
		{/if}

		<!-- Days worked -->
		<div class="mb-2 flex items-center justify-between">
			<h2 class="text-sm font-bold uppercase tracking-wider text-muted-foreground">Dias trabalhados</h2>
			{#if assignments.length > 0}
				<span class="text-[10px] text-muted-foreground">toque no dia para excluir</span>
			{/if}
		</div>
		{#if assignments.length === 0}
			<p class="mb-5 text-sm text-muted-foreground">Nenhum dia registrado</p>
		{:else}
			<div class="stagger mb-5 divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
				{#each assignments as assignment (assignment.id)}
					{@const dateStr = getDateForAssignment(assignment)}
					{@const included = !deselectedDays.has(assignment.id)}
					<div class="flex items-center justify-between gap-2 px-4 py-3 {included ? '' : 'opacity-40'}">
						<button
							type="button"
							onclick={() => toggleDay(assignment.id)}
							aria-pressed={included}
							aria-label="{included ? 'Excluir' : 'Incluir'} {getDayName(dateStr)} {formatDate(dateStr)} do pagamento"
							class="-my-1 flex flex-1 items-center gap-2 py-1 text-left text-sm"
						>
							<span
								class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all
									{included ? 'border-success bg-success/20' : 'border-muted-foreground bg-transparent'}"
							>
								{#if included}
									<span class="h-1.5 w-1.5 rounded-full bg-success"></span>
								{/if}
							</span>
							<span class="{included ? 'font-medium' : 'font-medium line-through'}">{getDayName(dateStr)}</span>
							<span class="text-muted-foreground {included ? '' : 'line-through'}">{formatDate(dateStr)}</span>
						</button>
						<Input
							type="number"
							value={assignment.rate_override ?? collab.base_rate}
							onchange={(e) => setRateOverride(assignment.id, e.currentTarget.value)}
							class="w-24 text-right font-medium"
						/>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Consumption -->
		<div class="mb-2 flex items-center justify-between">
			<h2 class="text-sm font-bold uppercase tracking-wider text-muted-foreground">Consumo</h2>
			{#if entries.length > 0}
				<span class="text-[10px] text-muted-foreground">consumo após o último dia pago fica pendente</span>
			{/if}
		</div>
		{#if entries.length === 0}
			<p class="mb-5 text-sm text-muted-foreground">Nenhum consumo</p>
		{:else}
			<div class="stagger mb-5 divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
				{#each entries as entry (entry.id)}
					{@const product = entry.product_id ? products.getById(entry.product_id) : null}
					{@const name = entry.custom_name ?? product?.name ?? '?'}
					{@const included = isEntryIncluded(entry)}
					<div class="flex items-center justify-between gap-2 px-4 py-3 {included ? '' : 'opacity-40'}">
						<button
							type="button"
							onclick={() => toggleEntry(entry)}
							aria-pressed={included}
							aria-label="{included ? 'Excluir' : 'Incluir'} {name} de {formatDate(entry.date)} do pagamento"
							class="-my-1 flex flex-1 items-center gap-2 py-1 text-left text-sm"
						>
							<span
								class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all
									{included ? 'border-primary bg-primary/20' : 'border-muted-foreground bg-transparent'}"
							>
								{#if included}
									<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
								{/if}
							</span>
							<span class="{included ? '' : 'line-through'}">{name} <span class="text-muted-foreground">x{entry.quantity}{#if entry.split_count > 1} ÷{entry.split_count}{/if}</span></span>
							<span class="text-muted-foreground text-xs {included ? '' : 'line-through'}">{formatDate(entry.date)}</span>
						</button>
						<span class="text-sm font-medium text-primary {included ? '' : 'line-through'}">{formatCurrency(entryValue(entry, getPrice))}</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Reimbursements -->
		{#if reimbursements.length > 0}
			<h2 class="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Ressarcimentos</h2>
			<div class="stagger mb-5 divide-y divide-border rounded-2xl bg-card shadow-md shadow-black/10">
				{#each reimbursements as r (r.id)}
					<div class="flex items-center justify-between px-4 py-3">
						<div class="text-sm">
							<span class="font-medium">{r.notes || 'Ressarcimento'}</span>
							<span class="text-muted-foreground"> {formatDate(r.date)}</span>
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
						<Share class="h-5 w-5" />
					</button>
				</div>
				<button
					onclick={copyPixKey}
					class="mb-3 mx-auto flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors active:text-info"
				>
					<Copy class="h-3 w-3" />
					Chave: {collab.pix_key} <span class="text-info">(toque p/ copiar)</span>
				</button>
			{:else}
				<div class="mb-3 rounded-2xl bg-card p-3 ring-1 ring-info/20">
					<p class="mb-2 text-xs text-muted-foreground">Sem chave PIX cadastrada</p>
					<div class="flex gap-2">
						<Input
							bind:value={pixKeyDraft}
							placeholder="CPF, e-mail, telefone..."
							class="flex-1 focus-visible:ring-info/50"
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

		<Button
			size="lg"
			onclick={markPaid}
			disabled={!hasSomethingToPay}
			class="pressable h-auto w-full rounded-2xl bg-success py-3.5 font-semibold text-background shadow-lg shadow-success/20 hover:bg-success/90 disabled:opacity-50"
		>
			{#if selectedAssignments.length < assignments.length}
				Pagar {selectedAssignments.length} de {assignments.length} dias
			{:else}
				Marcar como Pago
			{/if}
		</Button>
	</div>
{:else}
	<PageHeader title="Não encontrado" backHref="/pagamentos" />
{/if}
