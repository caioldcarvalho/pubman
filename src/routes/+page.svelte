<script lang="ts">
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { formatCurrency } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import Users from '@lucide/svelte/icons/users';
	import TextAlignJustify from '@lucide/svelte/icons/text-align-justify';
	import Beer from '@lucide/svelte/icons/beer';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Wallet from '@lucide/svelte/icons/wallet';
	import ChartNoAxesColumn from '@lucide/svelte/icons/chart-no-axes-column';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

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
			<p class="mt-1 text-sm text-muted-foreground">Painel do gerente</p>
		</div>
		<Button variant="secondary" size="xs" class="text-muted-foreground" onclick={() => auth.logout()} aria-label="Sair">
			Sair
		</Button>
	</div>

	<div class="stagger grid grid-cols-2 gap-3">
		<a href="/colaboradores" class="pressable rounded-2xl bg-card p-4 shadow-lg shadow-black/20">
			<div class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
				<Users class="h-4 w-4 text-muted-foreground" />
			</div>
			<div class="text-2xl font-bold">{collaborators.active.length}</div>
			<div class="text-xs text-muted-foreground">Colaboradores</div>
		</a>

		<a href="/cardapio" class="pressable rounded-2xl bg-card p-4 shadow-lg shadow-black/20">
			<div class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
				<TextAlignJustify class="h-4 w-4 text-muted-foreground" />
			</div>
			<div class="text-2xl font-bold">{products.active.length}</div>
			<div class="text-xs text-muted-foreground">Produtos</div>
		</a>

		<a href="/consumo" class="pressable rounded-2xl bg-card p-4 shadow-lg shadow-black/20">
			<div class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
				<Beer class="h-4 w-4 text-primary" />
			</div>
			<div class="text-2xl font-bold text-primary">{formatCurrency(totalConsumption)}</div>
			<div class="text-xs text-muted-foreground">Consumo total</div>
		</a>

		<a href="/compras" class="pressable rounded-2xl bg-card p-4 shadow-lg shadow-black/20">
			<div class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-warning/15">
				<ShoppingBag class="h-4 w-4 text-warning" />
			</div>
			<div class="text-2xl font-bold text-warning">{formatCurrency(purchases.totalPending)}</div>
			<div class="text-xs text-muted-foreground">A ressarcir</div>
		</a>
	</div>

	<div class="stagger mt-6 space-y-3">
		<a href="/escala" class="pressable flex items-center gap-4 rounded-2xl bg-card p-4 shadow-lg shadow-black/20">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
				<Calendar class="h-6 w-6 text-primary" />
			</div>
			<div class="flex-1">
				<div class="font-semibold">Escalas</div>
				<div class="text-sm text-muted-foreground">Gerenciar fins de semana</div>
			</div>
			<ChevronRight class="h-4 w-4 text-muted-foreground" />
		</a>

		<a href="/pagamentos" class="pressable flex items-center gap-4 rounded-2xl bg-card p-4 shadow-lg shadow-black/20">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-success/20 to-success/5">
				<Wallet class="h-6 w-6 text-success" />
			</div>
			<div class="flex-1">
				<div class="font-semibold">Pagamentos</div>
				<div class="text-sm text-muted-foreground">Relatório e fechamento</div>
			</div>
			<ChevronRight class="h-4 w-4 text-muted-foreground" />
		</a>

		<a href="/resumo" class="pressable flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent p-4 shadow-lg shadow-black/20 ring-1 ring-primary/20">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10">
				<ChartNoAxesColumn class="h-6 w-6 text-primary" />
			</div>
			<div class="flex-1">
				<div class="font-semibold">Resumo Financeiro</div>
				<div class="text-sm text-muted-foreground">Freelas + reembolsos</div>
			</div>
			<ChevronRight class="h-4 w-4 text-muted-foreground" />
		</a>
	</div>
</div>
