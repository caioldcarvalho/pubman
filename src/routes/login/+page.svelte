<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

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
			<p class="mt-2 text-sm text-muted-foreground">Painel do gerente</p>
		</div>

		<form onsubmit={handleLogin} class="space-y-4">
			{#if error}
				<div class="rounded-xl bg-primary/15 px-4 py-3 text-sm text-primary ring-1 ring-primary/30">
					{error}
				</div>
			{/if}

			<div class="space-y-1.5">
				<Label for="email" class="text-xs text-muted-foreground">Email</Label>
				<Input
					id="email"
					bind:value={email}
					type="email"
					autocomplete="email"
					placeholder="seu@email.com"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="password" class="text-xs text-muted-foreground">Senha</Label>
				<Input
					id="password"
					bind:value={password}
					type="password"
					autocomplete="current-password"
					placeholder="••••••••"
				/>
			</div>

			<Button
				type="submit"
				size="lg"
				class="pressable h-auto w-full rounded-2xl py-3.5 font-semibold shadow-lg shadow-primary/20"
				disabled={submitting || !email || !password || isLocked}
			>
				{#if isLocked}
					Bloqueado ({countdown}s)
				{:else if submitting}
					Entrando...
				{:else}
					Entrar
				{/if}
			</Button>
		</form>
	</div>
</div>
