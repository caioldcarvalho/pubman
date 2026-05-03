<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let submitting = $state(false);
	let attempts = $state(0);
	let lockedUntil = $state(0);

	const isLocked = $derived(Date.now() < lockedUntil);

	function getRemainingSeconds() {
		return Math.ceil((lockedUntil - Date.now()) / 1000);
	}

	// Update countdown
	let countdown = $state(0);
	$effect(() => {
		if (lockedUntil > 0) {
			const interval = setInterval(() => {
				countdown = getRemainingSeconds();
				if (countdown <= 0) {
					lockedUntil = 0;
					countdown = 0;
				}
			}, 1000);
			return () => clearInterval(interval);
		}
	});

	async function handleLogin() {
		if (!email || !password || isLocked) return;
		submitting = true;
		error = '';

		const err = await auth.login(email, password);
		if (err) {
			attempts++;
			// Exponential backoff: 5s, 15s, 30s, 60s
			if (attempts >= 3) {
				const delay = Math.min(60, 5 * Math.pow(2, attempts - 3)) * 1000;
				lockedUntil = Date.now() + delay;
				error = `Muitas tentativas. Tente novamente em ${Math.ceil(delay / 1000)}s.`;
			} else {
				error = 'Email ou senha incorretos.';
			}
			submitting = false;
		} else {
			attempts = 0;
			goto('/');
		}
	}
</script>

<div class="flex min-h-dvh flex-col items-center justify-center px-6">
	<div class="animate-in w-full max-w-sm">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold tracking-tight">Ludens Club</h1>
			<p class="mt-2 text-sm text-text-muted">Painel do gerente</p>
		</div>

		<form onsubmit={handleLogin} class="space-y-4">
			{#if error}
				<div class="rounded-xl bg-accent/15 px-4 py-3 text-sm text-accent ring-1 ring-accent/30">
					{error}
				</div>
			{/if}

			<div>
				<label for="email" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-muted">Email</label>
				<input
					id="email"
					bind:value={email}
					type="email"
					autocomplete="email"
					class="w-full rounded-2xl bg-surface px-4 py-3 text-text outline-none shadow-md shadow-black/10 transition-shadow focus:ring-2 focus:ring-accent/50"
					placeholder="seu@email.com"
				/>
			</div>

			<div>
				<label for="password" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-muted">Senha</label>
				<input
					id="password"
					bind:value={password}
					type="password"
					autocomplete="current-password"
					class="w-full rounded-2xl bg-surface px-4 py-3 text-text outline-none shadow-md shadow-black/10 transition-shadow focus:ring-2 focus:ring-accent/50"
					placeholder="••••••••"
				/>
			</div>

			<button
				type="submit"
				disabled={submitting || !email || !password || isLocked}
				class="pressable w-full rounded-2xl bg-accent py-3.5 font-semibold text-white shadow-lg shadow-accent/20 transition-all disabled:opacity-40 disabled:shadow-none"
			>
				{#if isLocked}
					Bloqueado ({countdown}s)
				{:else if submitting}
					Entrando...
				{:else}
					Entrar
				{/if}
			</button>
		</form>
	</div>
</div>
