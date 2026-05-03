<script lang="ts">
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { formatCurrency } from '$lib/utils';

	const totalConsumption = $derived(
		collaborators.active.reduce((sum, c) => {
			return sum + consumption.totalByCollaborator(c.id, (pid) => products.getPrice(pid));
		}, 0)
	);
</script>

<div class="px-4 pt-8">
	<div class="mb-8 flex items-start justify-between animate-in">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Ludens Club</h1>
			<p class="mt-1 text-sm text-text-muted">Painel do gerente</p>
		</div>
		<button
			onclick={() => auth.logout()}
			class="rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors active:bg-surface-2"
			aria-label="Sair"
		>
			Sair
		</button>
	</div>

	<div class="stagger grid grid-cols-2 gap-3">
		<a href="/colaboradores" class="pressable rounded-2xl bg-surface p-4 shadow-lg shadow-black/20">
			<div class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
				<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2M9 7a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
			</div>
			<div class="text-2xl font-bold">{collaborators.active.length}</div>
			<div class="text-xs text-text-muted">Colaboradores</div>
		</a>

		<a href="/cardapio" class="pressable rounded-2xl bg-surface p-4 shadow-lg shadow-black/20">
			<div class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
				<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19h16M4 15h16M4 11h16M4 7h16" /></svg>
			</div>
			<div class="text-2xl font-bold">{products.active.length}</div>
			<div class="text-xs text-text-muted">Produtos</div>
		</a>

		<a href="/consumo" class="pressable rounded-2xl bg-surface p-4 shadow-lg shadow-black/20">
			<div class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">
				<svg class="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 2l0 6c0 1.7 1.3 3 3 3h1v9h2V11h1c1.7 0 3-1.3 3-3V2M19 2v8a4 4 0 01-4 4h-1v8h-2" /></svg>
			</div>
			<div class="text-2xl font-bold text-accent">{formatCurrency(totalConsumption)}</div>
			<div class="text-xs text-text-muted">Consumo total</div>
		</a>

		<a href="/compras" class="pressable rounded-2xl bg-surface p-4 shadow-lg shadow-black/20">
			<div class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-warning-soft">
				<svg class="h-4 w-4 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></svg>
			</div>
			<div class="text-2xl font-bold text-warning">{formatCurrency(purchases.totalPending)}</div>
			<div class="text-xs text-text-muted">A ressarcir</div>
		</a>
	</div>

	<div class="stagger mt-6 space-y-3">
		<a href="/escala" class="pressable flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-lg shadow-black/20">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5">
				<svg class="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M6 2v2M18 2v2M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
				</svg>
			</div>
			<div class="flex-1">
				<div class="font-semibold">Escalas</div>
				<div class="text-sm text-text-muted">Gerenciar fins de semana</div>
			</div>
			<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" /></svg>
		</a>

		<a href="/pagamentos" class="pressable flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-lg shadow-black/20">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-success/20 to-success/5">
				<svg class="h-6 w-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 14a1 1 0 100 2 1 1 0 000-2z" />
				</svg>
			</div>
			<div class="flex-1">
				<div class="font-semibold">Pagamentos</div>
				<div class="text-sm text-text-muted">Relatório e fechamento</div>
			</div>
			<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" /></svg>
		</a>

		<a href="/resumo" class="pressable flex items-center gap-4 rounded-2xl bg-gradient-to-r from-accent/10 to-transparent p-4 shadow-lg shadow-black/20 ring-1 ring-accent/20">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/10">
				<svg class="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 20V10M12 20V4M6 20v-6" />
				</svg>
			</div>
			<div class="flex-1">
				<div class="font-semibold">Resumo Financeiro</div>
				<div class="text-sm text-text-muted">Freelas + reembolsos</div>
			</div>
			<svg class="h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6" /></svg>
		</a>
	</div>
</div>
