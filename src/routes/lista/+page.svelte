<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { tasks, type TaskKind } from '$lib/stores/tasks.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';

	let newShopping = $state('');
	let newTodo = $state('');

	// Riscados ficam no fim da lista
	const shoppingSorted = $derived(
		[...tasks.shopping].sort((a, b) => Number(a.done) - Number(b.done))
	);
	const checkedShopping = $derived(tasks.shopping.filter((t) => t.done));

	async function addItem(kind: TaskKind) {
		const value = kind === 'shopping' ? newShopping : newTodo;
		const task = await tasks.add(kind, value);
		if (!task) return;
		if (kind === 'shopping') newShopping = '';
		else newTodo = '';
	}

	// Colar texto com várias linhas adiciona um item por linha
	async function onShoppingPaste(e: ClipboardEvent) {
		const text = e.clipboardData?.getData('text') ?? '';
		if (!text.includes('\n')) return;
		e.preventDefault();
		const added = await tasks.addMany('shopping', text.split('\n'));
		if (added.length > 0) {
			newShopping = '';
			toast.success(`${added.length} ${added.length === 1 ? 'item adicionado' : 'itens adicionados'}`);
		}
	}

	async function completeTodo(id: string) {
		await tasks.remove(id);
		toast.info('Tarefa concluída');
	}

	async function deleteShopping(id: string) {
		await tasks.remove(id);
		toast.info('Item removido da lista');
	}

	function addCheckedToPurchase() {
		const ids = checkedShopping.map((t) => t.id);
		if (ids.length === 0) return;
		goto(`/compras/nova?items=${ids.join(',')}`);
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
				onpaste={onShoppingPaste}
				type="text"
				placeholder="Cerveja, gelo, limão... (cole uma lista, 1 por linha)"
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
				{#each shoppingSorted as item (item.id)}
					<li class="flex items-center gap-1 rounded-xl bg-card pr-1 shadow-md shadow-black/10 {item.done ? 'opacity-60' : ''}">
						<button
							onclick={() => tasks.toggleDone(item.id)}
							class="group flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left text-sm transition-all active:scale-[0.99]"
						>
							<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors {item.done ? 'bg-primary text-primary-foreground' : 'ring-1 ring-border group-hover:ring-primary/60'}">
								{#if item.done}
									<Check class="h-3.5 w-3.5" strokeWidth={3} />
								{/if}
							</span>
							<span class="flex-1 {item.done ? 'text-muted-foreground line-through' : 'text-foreground'}">{item.description}</span>
						</button>
						<button
							onclick={() => deleteShopping(item.id)}
							aria-label="Remover {item.description}"
							class="rounded-lg p-2 text-muted-foreground/60 transition-all active:scale-90 hover:text-primary"
						>
							<X class="h-4 w-4" />
						</button>
					</li>
				{/each}
			</ul>
			{#if checkedShopping.length > 0}
				<Button class="mt-3 w-full" size="lg" onclick={addCheckedToPurchase}>
					Adicionar {checkedShopping.length} {checkedShopping.length === 1 ? 'marcado' : 'marcados'} à compra
				</Button>
			{/if}
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
							onclick={() => completeTodo(item.id)}
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
