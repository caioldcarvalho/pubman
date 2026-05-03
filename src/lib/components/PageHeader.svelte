<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		backHref?: string;
		children?: Snippet;
	}

	let { title, backHref, children }: Props = $props();
</script>

<header class="sticky top-0 z-40 flex items-center gap-3 border-b border-white/5 bg-bg/80 px-4 py-3.5 backdrop-blur-xl">
	{#if backHref}
		<a href={backHref} class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors active:bg-surface">
			<svg class="h-5 w-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M15 18l-6-6 6-6" />
			</svg>
		</a>
	{/if}
	<h1 class="flex-1 text-lg font-bold tracking-tight">{title}</h1>
	{#if children}
		{@render children()}
	{/if}
</header>
