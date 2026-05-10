import { supabase } from '$lib/supabase';

export interface Purchase {
	id: string;
	amount: number;
	date: string;
	notes: string;
	reimbursed: boolean;
	collaborator_id: string | null;
	created_at: string;
}

class PurchaseStore {
	list = $state<Purchase[]>([]);
	loaded = $state(false);

	get pending() {
		return this.list.filter((p) => !p.reimbursed);
	}

	get totalPending() {
		return this.pending.reduce((sum, p) => sum + p.amount, 0);
	}

	pendingByCollaborator(collaboratorId: string): Purchase[] {
		return this.pending.filter((p) => p.collaborator_id === collaboratorId);
	}

	totalPendingByCollaborator(collaboratorId: string): number {
		return this.pendingByCollaborator(collaboratorId).reduce((sum, p) => sum + p.amount, 0);
	}

	async load() {
		const { data } = await supabase
			.from('purchases')
			.select('*')
			.order('date', { ascending: false });
		if (data) this.list = data;
		this.loaded = true;
	}

	async add(purchase: { amount: number; date: string; notes: string; collaborator_id?: string | null }) {
		const { data } = await supabase.from('purchases').insert(purchase).select().single();
		if (data) this.list.unshift(data);
	}

	async markReimbursed(id: string) {
		await supabase.from('purchases').update({ reimbursed: true }).eq('id', id);
		const idx = this.list.findIndex((p) => p.id === id);
		if (idx >= 0) this.list[idx] = { ...this.list[idx], reimbursed: true };
	}

	async remove(id: string) {
		await supabase.from('purchases').delete().eq('id', id);
		this.list = this.list.filter((p) => p.id !== id);
	}
}

export const purchases = new PurchaseStore();
