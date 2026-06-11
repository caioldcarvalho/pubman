<script lang="ts">
	import type { Snippet } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';

	interface Props {
		title: string;
		backHref?: string;
		children?: Snippet;
	}

	let { title, backHref, children }: Props = $props();
</script>

<header class="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3.5 backdrop-blur-xl">
	{#if backHref}
		<a href={backHref} class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors active:bg-card">
			<ChevronLeft class="h-5 w-5 text-muted-foreground" />
		</a>
	{/if}
	<h1 class="flex-1 text-lg font-bold tracking-tight">{title}</h1>
	{#if children}
		{@render children()}
	{/if}
</header>
