<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';

	const typeStyles = {
		success: 'bg-success/90 text-bg',
		error: 'bg-accent/90 text-white',
		info: 'bg-info/90 text-white',
	};

	const typeIcons = {
		success: 'M20 6L9 17l-5-5',
		error: 'M18 6L6 18M6 6l12 12',
		info: 'M12 16v-4M12 8h.01',
	};
</script>

{#if toast.list.length > 0}
	<div class="fixed top-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
		{#each toast.list as t (t.id)}
			<div class="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg {typeStyles[t.type]} {t.exiting ? 'toast-exit' : 'toast-enter'}">
				<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<path d={typeIcons[t.type]} />
				</svg>
				{t.message}
			</div>
		{/each}
	</div>
{/if}
