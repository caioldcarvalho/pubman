import { supabase } from '$lib/supabase';

export interface ConsumptionEntry {
	id: string;
	collaborator_id: string;
	product_id: string | null;
	quantity: number;
	date: string;
	created_at: string;
	custom_name?: string | null;
	custom_price?: number | null;
	payment_id: string | null;
}

export const DISCOUNT = 0.20;

class ConsumptionStore {
	list = $state<ConsumptionEntry[]>([]);
	loaded = $state(false);

	// Pre-computed totals by collaborator for O(1) lookup (pending only)
	private _byCollaborator = $derived(() => {
		const map = new Map<string, ConsumptionEntry[]>();
		for (const c of this.list) {
			if (c.payment_id) continue;
			const existing = map.get(c.collaborator_id);
			if (existing) existing.push(c);
			else map.set(c.collaborator_id, [c]);
		}
		return map;
	});

	getByCollaborator(collaboratorId: string): ConsumptionEntry[] {
		return this._byCollaborator().get(collaboratorId) ?? [];
	}

	getByPayment(paymentId: string): ConsumptionEntry[] {
		return this.list.filter((c) => c.payment_id === paymentId);
	}

	totalByCollaborator(collaboratorId: string, priceGetter: (id: string) => number): number {
		const entries = this.getByCollaborator(collaboratorId);
		let total = 0;
		for (const c of entries) {
			const price = c.custom_price ?? priceGetter(c.product_id!);
			total += c.quantity * price * (1 - DISCOUNT);
		}
		return total;
	}

	async load() {
		const { data } = await supabase
			.from('consumption')
			.select('*')
			.order('created_at', { ascending: false });
		if (data) this.list = data;
		this.loaded = true;
	}

	async add(entry: {
		collaborator_id: string;
		product_id?: string | null;
		quantity: number;
		date: string;
		custom_name?: string;
		custom_price?: number;
	}) {
		const { data } = await supabase.from('consumption').insert(entry).select().single();
		if (data) this.list.unshift(data);
	}

	async remove(id: string) {
		await supabase.from('consumption').delete().eq('id', id);
		this.list = this.list.filter((c) => c.id !== id);
	}

	async clearByCollaborator(collaboratorId: string) {
		await supabase.from('consumption').delete().eq('collaborator_id', collaboratorId);
		this.list = this.list.filter((c) => c.collaborator_id !== collaboratorId);
	}

	async settleByCollaborator(collaboratorId: string, paymentId: string): Promise<string[]> {
		const pendingIds = this.list
			.filter((c) => c.collaborator_id === collaboratorId && !c.payment_id)
			.map((c) => c.id);
		if (pendingIds.length === 0) return [];
		await supabase.from('consumption').update({ payment_id: paymentId }).in('id', pendingIds);
		for (const c of this.list) {
			if (pendingIds.includes(c.id)) c.payment_id = paymentId;
		}
		return pendingIds;
	}
}

export const consumption = new ConsumptionStore();
