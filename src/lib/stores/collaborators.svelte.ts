import { supabase } from '$lib/supabase';

export type Role = 'instrutor' | 'garcom' | 'bar' | 'cozinha';

export const ALL_ROLES: { value: Role; label: string }[] = [
	{ value: 'instrutor', label: 'Instrutor' },
	{ value: 'garcom', label: 'Garçom' },
	{ value: 'bar', label: 'Bar' },
	{ value: 'cozinha', label: 'Cozinha' },
];

const SALAO_ROLES: Role[] = ['instrutor', 'garcom'];

export interface Collaborator {
	id: string;
	name: string;
	roles: Role[];
	base_rate: number;
	stars: number;
	active: boolean;
	fixed: boolean;
	created_at: string;
}

export const COLLABORATOR_DISCOUNT = 0.20; // 20% desconto nos itens

class CollaboratorStore {
	list = $state<Collaborator[]>([]);
	loaded = $state(false);

	get active() {
		return this.list.filter((c) => c.active);
	}

	get freelancers() {
		return this.active.filter((c) => !c.fixed);
	}

	get fixedStaff() {
		return this.active.filter((c) => c.fixed);
	}

	get salaoStaff() {
		return this.active.filter((c) => c.roles.some((r) => SALAO_ROLES.includes(r)));
	}

	get salaoFreelancers() {
		return this.salaoStaff.filter((c) => !c.fixed);
	}

	get sorted() {
		return [...this.active].sort((a, b) => b.stars - a.stars);
	}

	getById(id: string) {
		return this.list.find((c) => c.id === id);
	}

	async load() {
		const { data } = await supabase
			.from('collaborators')
			.select('*')
			.order('stars', { ascending: false });
		if (data) this.list = data;
		this.loaded = true;
	}

	async add(collab: Omit<Collaborator, 'id' | 'created_at'>) {
		const { data } = await supabase.from('collaborators').insert(collab).select().single();
		if (data) this.list.push(data);
	}

	async update(id: string, updates: Partial<Collaborator>) {
		const { data } = await supabase.from('collaborators').update(updates).eq('id', id).select().single();
		if (data) {
			const idx = this.list.findIndex((c) => c.id === id);
			if (idx >= 0) this.list[idx] = data;
		}
	}

	async setStars(id: string, stars: number) {
		await this.update(id, { stars: Math.max(0, Math.min(5, stars)) });
	}
}

export const collaborators = new CollaboratorStore();
