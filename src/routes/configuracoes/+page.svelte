<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { products } from '$lib/stores/products.svelte';
	import { consumption } from '$lib/stores/consumption.svelte';
	import { purchases } from '$lib/stores/purchases.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { payments } from '$lib/stores/payments.svelte';
	import { events } from '$lib/stores/events.svelte';
	import { tasks } from '$lib/stores/tasks.svelte';
	import { exportBackup, importBackup } from '$lib/backup';
	import { toast } from '$lib/stores/toast.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Download from '@lucide/svelte/icons/download';
	import Upload from '@lucide/svelte/icons/upload';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	let exportPassword = $state('');
	let exporting = $state(false);
	let exportError = $state('');

	let importPassword = $state('');
	let importFile = $state<File | null>(null);
	let importing = $state(false);
	let importResult = $state<{ tablesRestored: number; rowsRestored: number } | null>(null);
	let importError = $state('');
	let confirmRestoreOpen = $state(false);

	async function handleExport() {
		if (!exportPassword || !auth.user?.email) return;
		exporting = true;
		exportError = '';
		try {
			const blob = await exportBackup(auth.user.email, exportPassword);
			const date = new Date().toISOString().slice(0, 10);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `pubman-backup-${date}.bak`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success('Backup exportado');
			exportPassword = '';
		} catch (e: any) {
			exportError = e.message ?? 'Erro ao exportar backup.';
		} finally {
			exporting = false;
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		importFile = input.files?.[0] || null;
	}

	function requestRestore() {
		if (!importFile || !importPassword) return;
		confirmRestoreOpen = true;
	}

	async function handleImport() {
		if (!importFile || !importPassword || !auth.user?.email) return;
		confirmRestoreOpen = false;
		importing = true;
		importResult = null;
		importError = '';
		try {
			const result = await importBackup(importFile, auth.user.email, importPassword);
			importResult = result;
			importPassword = '';
			importFile = null;
			await Promise.all([
				collaborators.load(),
				products.load(),
				consumption.load(),
				purchases.load(),
				schedule.load(),
				payments.load(),
				events.load(),
				tasks.load(),
			]);
			toast.success('Backup restaurado');
		} catch (e: any) {
			importError = e.message ?? 'Erro ao restaurar backup.';
		} finally {
			importing = false;
		}
	}
</script>

<PageHeader title="Configurações" backHref="/resumo" />

<div class="px-4 py-4">
	<!-- Export -->
	<div class="animate-in mb-4 rounded-2xl bg-card p-5 shadow-md shadow-black/10">
		<div class="mb-3 flex items-center gap-2">
			<Download class="h-5 w-5 text-primary" />
			<h2 class="font-semibold">Exportar Backup</h2>
		</div>
		<p class="mb-3 text-sm text-muted-foreground">
			Baixa um arquivo criptografado com todos os dados. Use sua senha de login pra proteger o
			arquivo.
		</p>
		<div class="flex items-end gap-2">
			<div class="flex-1 space-y-1.5">
				<Label for="export-password" class="text-xs text-muted-foreground">Senha de login</Label>
				<Input id="export-password" type="password" bind:value={exportPassword} placeholder="••••••••" />
			</div>
			<Button onclick={handleExport} disabled={exporting || !exportPassword}>
				{#if exporting}
					<LoaderCircle class="h-4 w-4 animate-spin" />
					Exportando...
				{:else}
					<Download class="h-4 w-4" />
					Exportar
				{/if}
			</Button>
		</div>
		{#if exportError}
			<div class="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
				<TriangleAlert class="h-4 w-4 shrink-0" />
				{exportError}
			</div>
		{/if}
	</div>

	<!-- Import -->
	<div class="animate-in mb-4 rounded-2xl bg-card p-5 shadow-md shadow-black/10">
		<div class="mb-3 flex items-center gap-2">
			<Upload class="h-5 w-5 text-warning" />
			<h2 class="font-semibold">Restaurar Backup</h2>
		</div>
		<p class="mb-1 text-sm text-muted-foreground">
			Carrega um arquivo <code class="rounded bg-muted px-1 py-0.5 text-xs">.bak</code> e restaura os
			dados.
		</p>
		<div class="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
			A restauração substitui todos os dados atuais. Não pode ser desfeita.
		</div>

		<div class="space-y-2">
			<input
				type="file"
				accept=".bak"
				onchange={handleFileSelect}
				class="w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary"
			/>
			<div class="flex items-end gap-2">
				<div class="flex-1 space-y-1.5">
					<Label for="import-password" class="text-xs text-muted-foreground">Senha de login</Label>
					<Input id="import-password" type="password" bind:value={importPassword} placeholder="••••••••" />
				</div>
				<Button variant="destructive" onclick={requestRestore} disabled={importing || !importFile || !importPassword}>
					{#if importing}
						<LoaderCircle class="h-4 w-4 animate-spin" />
						Restaurando...
					{:else}
						<Upload class="h-4 w-4" />
						Restaurar
					{/if}
				</Button>
			</div>
		</div>

		{#if importResult}
			<div class="mt-3 rounded-lg bg-success/15 px-3 py-2 text-xs font-medium text-success">
				Restaurado: {importResult.tablesRestored} tabelas, {importResult.rowsRestored} registros.
			</div>
		{:else if importError}
			<div class="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
				<TriangleAlert class="h-4 w-4 shrink-0" />
				{importError}
			</div>
		{/if}
	</div>

	<div class="flex items-start gap-3 rounded-2xl bg-card p-4 text-xs text-muted-foreground shadow-md shadow-black/10">
		<ShieldCheck class="mt-0.5 h-4 w-4 shrink-0" />
		<p>
			O backup é criptografado com AES-256-GCM usando sua senha de login (PBKDF2, 100.000
			iterações). Sem a senha correta, o arquivo não pode ser lido.
		</p>
	</div>
</div>

<!-- Confirm restore -->
{#if confirmRestoreOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
		<div class="animate-in w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
			<h3 class="mb-2 font-semibold">Confirmar restauração</h3>
			<p class="mb-1 text-sm text-muted-foreground">Tem certeza que deseja restaurar o backup?</p>
			<p class="mb-4 text-sm font-medium text-destructive">
				Todos os dados atuais serão substituídos permanentemente.
			</p>
			<div class="flex justify-end gap-2">
				<Button variant="secondary" onclick={() => (confirmRestoreOpen = false)}>Cancelar</Button>
				<Button variant="destructive" onclick={handleImport}>Restaurar</Button>
			</div>
		</div>
	</div>
{/if}
