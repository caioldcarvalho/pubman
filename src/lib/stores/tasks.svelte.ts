import { supabase } from '$lib/supabase';

export type TaskKind = 'todo' | 'shopping';

export interface Task {
	id: string;
	kind: TaskKind;
	description: string;
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
