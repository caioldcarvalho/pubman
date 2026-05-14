import { supabase } from '$lib/supabase';

export interface Payment {
	id: string;
	collaborator_id: string | null;
	paid_at: string;
	total_earned: number;
	total_consumed: number;
	total_reimbursed: number;
	net_amount: number;
	pix_key_used: string | null;
	notes: string;
	created_at: string;
}

class PaymentStore {
	list = $state<Payment[]>([]);
	loaded = $state(false);

	get byCollaborator() {
		const map = new Map<string, Payment[]>();
		for (const p of this.list) {
			if (!p.collaborator_id) continue;
			const arr = map.get(p.collaborator_id);
			if (arr) arr.push(p);
			else map.set(p.collaborator_id, [p]);
		}
		return map;
	}

	getByCollaborator(collaboratorId: string): Payment[] {
		return this.byCollaborator.get(collaboratorId) ?? [];
	}

	getById(id: string): Payment | undefined {
		return this.list.find((p) => p.id === id);
	}

	async load() {
		const { data } = await supabase
			.from('payments')
			.select('*')
			.order('paid_at', { ascending: false });
		if (data) this.list = data;
		this.loaded = true;
	}

	async create(payment: {
		collaborator_id: string | null;
		total_earned: number;
		total_consumed: number;
		total_reimbursed: number;
		net_amount: number;
		pix_key_used?: string | null;
		notes?: string;
	}): Promise<Payment | null> {
		const { data } = await supabase
			.from('payments')
			.insert({
				collaborator_id: payment.collaborator_id,
				total_earned: payment.total_earned,
				total_consumed: payment.total_consumed,
				total_reimbursed: payment.total_reimbursed,
				net_amount: payment.net_amount,
				pix_key_used: payment.pix_key_used ?? null,
				notes: payment.notes ?? '',
			})
			.select()
			.single();
		if (data) this.list.unshift(data);
		return data;
	}

	async remove(id: string) {
		await supabase.from('payments').delete().eq('id', id);
		this.list = this.list.filter((p) => p.id !== id);
	}
}

export const payments = new PaymentStore();
