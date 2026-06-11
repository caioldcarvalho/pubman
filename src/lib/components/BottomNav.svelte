<script lang="ts">
	import { page } from '$app/state';
	import Clock from '@lucide/svelte/icons/clock';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Beer from '@lucide/svelte/icons/beer';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Users from '@lucide/svelte/icons/users';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import ChartColumn from '@lucide/svelte/icons/chart-column';

	const tabs = [
		{ href: '/hoje', label: 'Noite', icon: Clock },
		{ href: '/escala', label: 'Escala', icon: Calendar },
		{ href: '/consumo', label: 'Consumo', icon: Beer },
		{ href: '/pagamentos', label: 'Pagar', icon: Wallet },
	] as const;

	const moreLinks = [
		{ href: '/dia', label: 'Gerenciar Dia', icon: CalendarDays },
		{ href: '/lista', label: 'Lista', icon: ListChecks },
		{ href: '/colaboradores', label: 'Colaboradores', icon: Users },
		{ href: '/cardapio', label: 'Cardápio', icon: UtensilsCrossed },
		{ href: '/compras', label: 'Compras', icon: ShoppingBag },
		{ href: '/resumo', label: 'Resumo', icon: ChartColumn },
	] as const;

	const morePaths = moreLinks.map((l) => l.href);

	let showMore = $state(false);

	const moreActive = $derived(morePaths.some((p) => page.url.pathname.startsWith(p)));

	function toggleMore() {
		showMore = !showMore;
	}

	// Close menu on navigation
	$effect(() => {
		page.url.pathname;
		showMore = false;
	});
</script>

<!-- More menu overlay -->
{#if showMore}
	<button class="fixed inset-0 z-40 bg-black/40" onclick={() => (showMore = false)} aria-label="Fechar menu"></button>
	<div class="fixed bottom-16 right-2 z-50 w-48 animate-in rounded-2xl bg-card p-2 shadow-xl shadow-black/30 ring-1 ring-border safe-bottom-menu">
		{#each moreLinks as link}
			{@const active = page.url.pathname.startsWith(link.href)}
			{@const Icon = link.icon}
			<a
				href={link.href}
				class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors
					{active ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'}"
			>
				<Icon class="h-4 w-4 shrink-0" />
				<span class="font-medium">{link.label}</span>
			</a>
		{/each}
	</div>
{/if}

<nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl safe-bottom">
	<div class="mx-auto flex max-w-lg">
		{#each tabs as tab}
			{@const active = page.url.pathname.startsWith(tab.href)}
			{@const Icon = tab.icon}
			<a
				href={tab.href}
				class="group relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
			>
				{#if active}
					<div class="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--primary-glow)]"></div>
				{/if}
				<Icon class="h-5 w-5 transition-all {active ? 'text-primary scale-110' : 'text-muted-foreground group-active:scale-90'}" />
				<span class="text-[10px] font-semibold transition-colors {active ? 'text-primary' : 'text-muted-foreground'}">{tab.label}</span>
			</a>
		{/each}

		<!-- More button -->
		<button
			onclick={toggleMore}
			class="group relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
		>
			{#if moreActive}
				<div class="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_var(--primary-glow)]"></div>
			{/if}
			<Ellipsis class="h-5 w-5 transition-all {moreActive || showMore ? 'text-primary scale-110' : 'text-muted-foreground group-active:scale-90'}" />
			<span class="text-[10px] font-semibold transition-colors {moreActive || showMore ? 'text-primary' : 'text-muted-foreground'}">Mais</span>
		</button>
	</div>
</nav>

<style>
	.safe-bottom {
		padding-bottom: env(safe-area-inset-bottom, 0);
	}
	.safe-bottom-menu {
		margin-bottom: env(safe-area-inset-bottom, 0);
	}
</style>
