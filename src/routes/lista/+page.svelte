<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { tasks, type TaskKind } from '$lib/stores/tasks.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';

	let newShopping = $state('');
	let newTodo = $state('');

	async function addItem(kind: TaskKind) {
		const value = kind === 'shopping' ? newShopping : newTodo;
		const task = await tasks.add(kind, value);
		if (!task) return;
		if (kind === 'shopping') newShopping = '';
		else newTodo = '';
	}

	async function tickItem(id: string, kind: TaskKind) {
		await tasks.remove(id);
		toast.info(kind === 'shopping' ? 'Item removido da lista' : 'Tarefa concluída');
	}

	function onKey(e: KeyboardEvent, kind: TaskKind) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addItem(kind);
		}
	}
</script>

<PageHeader title="Lista" />

<div class="px-4 py-4 space-y-6">
	<section class="animate-in">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-bold uppercase tracking-wider text-muted-foreground">A comprar</h2>
			<Badge variant="secondary" class="rounded-full text-[10px] font-semibold text-muted-foreground">{tasks.shopping.length}</Badge>
		</div>

		<div class="mb-3 flex gap-2">
			<Input
				bind:value={newShopping}
				onkeydown={(e) => onKey(e, 'shopping')}
				type="text"
				placeholder="Cerveja, gelo, limão..."
				class="flex-1"
			/>
			<Button onclick={() => addItem('shopping')} disabled={!newShopping.trim()}>
				+
			</Button>
		</div>

		{#if tasks.shopping.length === 0}
			<p class="rounded-2xl bg-card/50 px-4 py-6 text-center text-xs text-muted-foreground ring-1 ring-border">Nada na lista de compras</p>
		{:else}
			<ul class="space-y-1.5">
				{#each tasks.shopping as item (item.id)}
					<li>
						<button
							onclick={() => tickItem(item.id, 'shopping')}
							class="group flex w-full items-center gap-3 rounded-xl bg-card px-4 py-3 text-left text-sm shadow-md shadow-black/10 transition-all active:scale-[0.99]"
						>
							<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ring-border transition-colors group-hover:ring-primary/60"></span>
							<span class="flex-1 text-foreground">{item.description}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="animate-in">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-bold uppercase tracking-wider text-muted-foreground">Tarefas</h2>
			<Badge variant="secondary" class="rounded-full text-[10px] font-semibold text-muted-foreground">{tasks.todos.length}</Badge>
		</div>

		<div class="mb-3 flex gap-2">
			<Input
				bind:value={newTodo}
				onkeydown={(e) => onKey(e, 'todo')}
				type="text"
				placeholder="Buscar troco, ligar fornecedor..."
				class="flex-1"
			/>
			<Button onclick={() => addItem('todo')} disabled={!newTodo.trim()}>
				+
			</Button>
		</div>

		{#if tasks.todos.length === 0}
			<p class="rounded-2xl bg-card/50 px-4 py-6 text-center text-xs text-muted-foreground ring-1 ring-border">Nenhuma tarefa pendente</p>
		{:else}
			<ul class="space-y-1.5">
				{#each tasks.todos as item (item.id)}
					<li>
						<button
							onclick={() => tickItem(item.id, 'todo')}
							class="group flex w-full items-center gap-3 rounded-xl bg-card px-4 py-3 text-left text-sm shadow-md shadow-black/10 transition-all active:scale-[0.99]"
						>
							<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ring-border transition-colors group-hover:ring-primary/60"></span>
							<span class="flex-1 text-foreground">{item.description}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
