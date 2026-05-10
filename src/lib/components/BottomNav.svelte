<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/hoje', label: 'Noite', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 6v6l4 2' },
		{ href: '/escala', label: 'Escala', icon: 'M6 2v2M18 2v2M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
		{ href: '/consumo', label: 'Consumo', icon: 'M3 2l0 6c0 1.7 1.3 3 3 3h1v9h2V11h1c1.7 0 3-1.3 3-3V2M19 2v8a4 4 0 01-4 4h-1v8h-2' },
		{ href: '/pagamentos', label: 'Pagar', icon: 'M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 14a1 1 0 100 2 1 1 0 000-2z' },
	] as const;

	const moreLinks = [
		{ href: '/dia', label: 'Gerenciar Dia', icon: 'M8 7V3M16 7V3M7 11h10M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z' },
		{ href: '/colaboradores', label: 'Colaboradores', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2M9 7a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
		{ href: '/cardapio', label: 'Cardápio', icon: 'M4 19h16M4 15h16M4 11h16M4 7h16' },
		{ href: '/compras', label: 'Compras', icon: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0' },
		{ href: '/resumo', label: 'Resumo', icon: 'M18 20V10M12 20V4M6 20v-6' },
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
	<div class="fixed bottom-16 right-2 z-50 w-48 animate-in rounded-2xl bg-surface p-2 shadow-xl shadow-black/30 ring-1 ring-white/10 safe-bottom-menu">
		{#each moreLinks as link}
			{@const active = page.url.pathname.startsWith(link.href)}
			<a
				href={link.href}
				class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors
					{active ? 'bg-accent/15 text-accent' : 'text-text hover:bg-surface-2'}"
			>
				<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d={link.icon} />
				</svg>
				<span class="font-medium">{link.label}</span>
			</a>
		{/each}
	</div>
{/if}

<nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-surface/90 backdrop-blur-xl safe-bottom">
	<div class="mx-auto flex max-w-lg">
		{#each tabs as tab}
			{@const active = page.url.pathname.startsWith(tab.href)}
			<a
				href={tab.href}
				class="group relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
			>
				{#if active}
					<div class="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent-glow)]"></div>
				{/if}
				<svg
					class="h-5 w-5 transition-all {active ? 'text-accent scale-110' : 'text-text-muted group-active:scale-90'}"
					viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
				>
					<path d={tab.icon} />
				</svg>
				<span class="text-[10px] font-semibold transition-colors {active ? 'text-accent' : 'text-text-muted'}">{tab.label}</span>
			</a>
		{/each}

		<!-- More button -->
		<button
			onclick={toggleMore}
			class="group relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
		>
			{#if moreActive}
				<div class="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent-glow)]"></div>
			{/if}
			<svg
				class="h-5 w-5 transition-all {moreActive || showMore ? 'text-accent scale-110' : 'text-text-muted group-active:scale-90'}"
				viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
			>
				<circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
			</svg>
			<span class="text-[10px] font-semibold transition-colors {moreActive || showMore ? 'text-accent' : 'text-text-muted'}">Mais</span>
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
