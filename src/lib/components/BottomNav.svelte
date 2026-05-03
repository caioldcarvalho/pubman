<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/hoje', label: 'Hoje', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 6v6l4 2' },
		{ href: '/escala', label: 'Escala', icon: 'M6 2v2M18 2v2M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
		{ href: '/consumo', label: 'Consumo', icon: 'M3 2l0 6c0 1.7 1.3 3 3 3h1v9h2V11h1c1.7 0 3-1.3 3-3V2M19 2v8a4 4 0 01-4 4h-1v8h-2' },
		{ href: '/pagamentos', label: 'Pagar', icon: 'M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 14a1 1 0 100 2 1 1 0 000-2z' },
		{ href: '/resumo', label: 'Resumo', icon: 'M18 20V10M12 20V4M6 20v-6' },
	] as const;
</script>

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
	</div>
</nav>

<style>
	.safe-bottom {
		padding-bottom: env(safe-area-inset-bottom, 0);
	}
</style>
