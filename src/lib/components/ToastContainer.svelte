<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Info from '@lucide/svelte/icons/info';

	const typeStyles = {
		success: 'bg-success/90 text-background',
		error: 'bg-destructive/90 text-white',
		info: 'bg-info/90 text-white',
	};

	const typeIcons = {
		success: Check,
		error: X,
		info: Info,
	};
</script>

{#if toast.list.length > 0}
	<div class="fixed top-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
		{#each toast.list as t (t.id)}
			{@const Icon = typeIcons[t.type]}
			<div class="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg {typeStyles[t.type]} {t.exiting ? 'toast-exit' : 'toast-enter'}">
				<Icon class="h-4 w-4 shrink-0" strokeWidth={2.5} />
				{t.message}
			</div>
		{/each}
	</div>
{/if}
