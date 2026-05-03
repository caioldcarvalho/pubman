<script lang="ts">
	import '../app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import DataLoader from '$lib/components/DataLoader.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const isLoginPage = $derived(page.url.pathname === '/login');

	$effect(() => {
		if (!auth.loading && !auth.isAuthenticated && !isLoginPage) {
			goto('/login');
		}
	});
</script>

{#if auth.loading}
	<div class="flex min-h-dvh items-center justify-center">
		<div class="text-center">
			<div class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-surface-2 border-t-accent"></div>
			<p class="text-sm text-text-muted">Carregando...</p>
		</div>
	</div>
{:else if isLoginPage}
	<div class="page-transition mx-auto min-h-dvh max-w-lg bg-bg">
		{@render children()}
	</div>
	<ToastContainer />
{:else if auth.isAuthenticated}
	<DataLoader>
		{#key page.url.pathname}
			<div class="page-transition mx-auto min-h-dvh max-w-lg bg-bg pb-20">
				{@render children()}
			</div>
		{/key}
	</DataLoader>
	<BottomNav />
	<ToastContainer />
{/if}
