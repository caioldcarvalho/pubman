import { supabase } from '$lib/supabase';

export interface Event {
	id: string;
	date_id: string;
	name: string;
	description: string;
	expected_attendees: number | null;
	reserved_tables: string;
	created_at: string;
}

class EventStore {
	list = $state<Event[]>([]);
	loaded = $state(false);

	private _byDate = $derived(() => {
		const map = new Map<string, Event[]>();
		for (const e of this.list) {
			const arr = map.get(e.date_id);
			if (arr) arr.push(e);
			else map.set(e.date_id, [e]);
		}
		return map;
	});

	getByDateId(dateId: string): Event[] {
		return this._byDate().get(dateId) ?? [];
	}

	async load() {
		const { data } = await supabase
			.from('events')
			.select('*')
			.order('created_at', { ascending: false });
		if (data) this.list = data;
		this.loaded = true;
	}

	async add(event: {
		date_id: string;
		name: string;
		description?: string;
		expected_attendees?: number | null;
		reserved_tables?: string;
	}): Promise<Event | null> {
		const { data } = await supabase
			.from('events')
			.insert({
				date_id: event.date_id,
				name: event.name,
				description: event.description ?? '',
				expected_attendees: event.expected_attendees ?? null,
				reserved_tables: event.reserved_tables ?? '',
			})
			.select()
			.single();
		if (data) this.list.unshift(data);
		return data;
	}

	async update(id: string, updates: Partial<Omit<Event, 'id' | 'created_at'>>) {
		const { data } = await supabase
			.from('events')
			.update(updates)
			.eq('id', id)
			.select()
			.single();
		if (data) {
			const idx = this.list.findIndex((e) => e.id === id);
			if (idx >= 0) this.list[idx] = data;
		}
	}

	async remove(id: string) {
		await supabase.from('events').delete().eq('id', id);
		this.list = this.list.filter((e) => e.id !== id);
	}
}

export const events = new EventStore();
