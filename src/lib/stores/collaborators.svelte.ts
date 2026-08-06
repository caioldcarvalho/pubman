import { supabase } from '$lib/supabase';
import { schedule } from '$lib/stores/schedule.svelte';

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
	pix_key: string | null;
	created_at: string;
}

export const COLLABORATOR_DISCOUNT = 0.20; // 20% desconto nos itens

class CollaboratorStore {
	list = $state<Collaborator[]>([]);
	loaded = $state(false);

	readonly active = $derived(this.list.filter((c) => c.active));

	readonly freelancers = $derived(this.active.filter((c) => !c.fixed));

	readonly fixedStaff = $derived(this.active.filter((c) => c.fixed));

	readonly salaoStaff = $derived(
		this.active.filter((c) => c.roles.some((r) => SALAO_ROLES.includes(r))),
	);

	readonly salaoFreelancers = $derived(this.salaoStaff.filter((c) => !c.fixed));

	readonly cozinhaStaff = $derived(this.active.filter((c) => c.roles.includes('cozinha')));

	readonly cozinhaFreelancers = $derived(this.cozinhaStaff.filter((c) => !c.fixed));

	readonly barStaff = $derived(this.active.filter((c) => c.roles.includes('bar')));

	readonly barFreelancers = $derived(this.barStaff.filter((c) => !c.fixed));

	readonly sorted = $derived([...this.active].sort((a, b) => b.stars - a.stars));

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

	async add(collab: Omit<Collaborator, 'id' | 'created_at' | 'pix_key'> & { pix_key?: string | null }) {
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

	/**
	 * Exclui um freelancer. Restrito a `fixed === false` e bloqueado se houver
	 * escalas não liquidadas (`payment_id` nulo) — `assignments`/`consumption`/`availability`
	 * têm ON DELETE CASCADE em collaborators, então excluir com dias não pagos faria
	 * a dívida sumir sem rastro.
	 */
	async remove(id: string) {
		const collab = this.getById(id);
		if (!collab) return;
		if (collab.fixed) throw new Error('Colaborador fixo não pode ser excluído. Torne-o freela primeiro.');

		const hasUnsettledDays = schedule.assignments.some(
			(a) => a.collaborator_id === id && !a.payment_id,
		);
		if (hasUnsettledDays) {
			throw new Error('Há dias escalados ainda não pagos. Liquide o pagamento ou remova as escalas antes de excluir.');
		}

		const { error } = await supabase.from('collaborators').delete().eq('id', id);
		if (error) throw new Error(error.message);
		this.list = this.list.filter((c) => c.id !== id);
	}
}

export const collaborators = new CollaboratorStore();
