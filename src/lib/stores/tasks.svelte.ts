import { supabase } from '$lib/supabase';

export type TaskKind = 'todo' | 'shopping';

export interface Task {
	id: string;
	kind: TaskKind;
	description: string;
	done: boolean;
	created_at: string;
}

class TaskStore {
	list = $state<Task[]>([]);
	loaded = $state(false);

	get todos(): Task[] {
		return this.list.filter((t) => t.kind === 'todo');
	}

	get shopping(): Task[] {
		return this.list.filter((t) => t.kind === 'shopping');
	}

	async load() {
		const { data } = await supabase
			.from('tasks')
			.select('*')
			.order('created_at', { ascending: true });
		if (data) this.list = data;
		this.loaded = true;
	}

	async add(kind: TaskKind, description: string): Promise<Task | null> {
		const trimmed = description.trim();
		if (!trimmed) return null;
		const { data } = await supabase
			.from('tasks')
			.insert({ kind, description: trimmed })
			.select()
			.single();
		if (data) this.list.push(data);
		return data;
	}

	/** Adiciona vários itens de uma vez (ex: texto colado, um por linha). */
	async addMany(kind: TaskKind, descriptions: string[]): Promise<Task[]> {
		const rows = descriptions
			.map((d) => d.trim())
			.filter(Boolean)
			.map((description) => ({ kind, description }));
		if (rows.length === 0) return [];
		const { data } = await supabase.from('tasks').insert(rows).select();
		if (data) this.list.push(...data);
		return data ?? [];
	}

	async toggleDone(id: string) {
		const task = this.list.find((t) => t.id === id);
		if (!task) return;
		const done = !task.done;
		await supabase.from('tasks').update({ done }).eq('id', id);
		task.done = done;
	}

	async remove(id: string) {
		await supabase.from('tasks').delete().eq('id', id);
		this.list = this.list.filter((t) => t.id !== id);
	}

	async removeMany(ids: string[]) {
		if (ids.length === 0) return;
		await supabase.from('tasks').delete().in('id', ids);
		this.list = this.list.filter((t) => !ids.includes(t.id));
	}
}

export const tasks = new TaskStore();
