import { supabase } from '$lib/supabase';

export interface Product {
	id: string;
	name: string;
	price: number;
	category: string;
	active: boolean;
	created_at: string;
}

class ProductStore {
	list = $state<Product[]>([]);
	loaded = $state(false);

	// Pre-computed lookup map for O(1) access
	private _map = $derived(new Map(this.list.map((p) => [p.id, p])));
	private _priceMap = $derived(new Map(this.list.map((p) => [p.id, p.price])));

	get active() {
		return this.list.filter((p) => p.active);
	}

	get categories() {
		return [...new Set(this.active.map((p) => p.category))];
	}

	getByCategory(category: string) {
		return this.active.filter((p) => p.category === category);
	}

	getById(id: string): Product | undefined {
		return this._map.get(id);
	}

	getPrice(id: string): number {
		return this._priceMap.get(id) ?? 0;
	}

	async load() {
		const { data } = await supabase
			.from('products')
			.select('*')
			.order('category')
			.order('name');
		if (data) this.list = data;
		this.loaded = true;
	}

	async add(product: Omit<Product, 'id' | 'created_at'>) {
		const { data } = await supabase.from('products').insert(product).select().single();
		if (data) this.list.push(data);
	}

	async update(id: string, updates: Partial<Product>) {
		const { data } = await supabase.from('products').update(updates).eq('id', id).select().single();
		if (data) {
			const idx = this.list.findIndex((p) => p.id === id);
			if (idx >= 0) this.list[idx] = data;
		}
	}

	async remove(id: string) {
		await this.update(id, { active: false });
	}
}

export const products = new ProductStore();
