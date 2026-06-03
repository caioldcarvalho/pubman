import { supabase } from '$lib/supabase';
import { round2 } from '$lib/utils';

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
	split_count: number;
}

export const DISCOUNT = 0.20;

/**
 * Net value an entry costs its collaborator: price * qty, minus the 20% discount,
 * divided by how many people split it. Single source of truth for consumption value.
 */
export function entryValue(
	entry: Pick<ConsumptionEntry, 'custom_price' | 'product_id' | 'quantity' | 'split_count'>,
	getPrice: (id: string) => number,
): number {
	const price = entry.custom_price ?? getPrice(entry.product_id!);
	const splits = entry.split_count && entry.split_count > 1 ? entry.split_count : 1;
	return round2((price * entry.quantity * (1 - DISCOUNT)) / splits);
}

class ConsumptionStore {
	list = $state<ConsumptionEntry[]>([]);
	loaded = $state(false);

	// Pre-computed totals by collaborator for O(1) lookup (pending only)
	private _byCollaborator = $derived.by(() => {
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
		return this._byCollaborator.get(collaboratorId) ?? [];
	}

	getByPayment(paymentId: string): ConsumptionEntry[] {
		return this.list.filter((c) => c.payment_id === paymentId);
	}

	totalByCollaborator(collaboratorId: string, priceGetter: (id: string) => number): number {
		const entries = this.getByCollaborator(collaboratorId);
		let total = 0;
		for (const c of entries) {
			total += entryValue(c, priceGetter);
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
		split_count?: number;
	}) {
		const { data } = await supabase.from('consumption').insert(entry).select().single();
		if (data) this.list.unshift(data);
	}

	/** Add the same item for several collaborators at once, splitting the value equally. */
	async addSplit(
		collaboratorIds: string[],
		entry: {
			product_id?: string | null;
			quantity: number;
			date: string;
			custom_name?: string;
			custom_price?: number;
		},
	) {
		const split_count = collaboratorIds.length;
		const rows = collaboratorIds.map((collaborator_id) => ({
			...entry,
			collaborator_id,
			split_count,
		}));
		const { data } = await supabase.from('consumption').insert(rows).select();
		if (data) this.list.unshift(...data);
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
