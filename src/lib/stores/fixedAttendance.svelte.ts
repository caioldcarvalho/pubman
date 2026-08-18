import { supabase } from '$lib/supabase';

export interface FixedAttendance {
	id: string;
	collaborator_id: string;
	date: string;
	check_in: string | null;
	check_out: string | null;
	created_at: string;
}

class FixedAttendanceStore {
	list = $state<FixedAttendance[]>([]);
	loaded = $state(false);

	private _byCollaboratorAndDate = $derived.by(() => {
		const map = new Map<string, FixedAttendance>();
		for (const a of this.list) map.set(`${a.collaborator_id}|${a.date}`, a);
		return map;
	});

	getFor(collaboratorId: string, date: string): FixedAttendance | undefined {
		return this._byCollaboratorAndDate.get(`${collaboratorId}|${date}`);
	}

	getByCollaborator(collaboratorId: string): FixedAttendance[] {
		return this.list
			.filter((a) => a.collaborator_id === collaboratorId)
			.sort((a, b) => b.date.localeCompare(a.date));
	}

	/** Entradas do colaborador dentro do mês corrente (yearMonth: 'YYYY-MM'). */
	getByCollaboratorMonth(collaboratorId: string, yearMonth: string): FixedAttendance[] {
		return this.getByCollaborator(collaboratorId).filter((a) => a.date.startsWith(yearMonth));
	}

	async load() {
		const { data } = await supabase.from('fixed_attendance').select('*').order('date', { ascending: false });
		if (data) this.list = data;
		this.loaded = true;
	}

	/** Cria ou atualiza o ponto do colaborador naquele dia (upsert por collaborator_id+date). */
	async setTimes(collaboratorId: string, date: string, checkIn: string | null, checkOut: string | null) {
		const existing = this.getFor(collaboratorId, date);
		if (existing) {
			const { data } = await supabase
				.from('fixed_attendance')
				.update({ check_in: checkIn, check_out: checkOut })
				.eq('id', existing.id)
				.select()
				.single();
			if (data) {
				const idx = this.list.findIndex((a) => a.id === existing.id);
				if (idx >= 0) this.list[idx] = data;
			}
		} else {
			const { data } = await supabase
				.from('fixed_attendance')
				.insert({ collaborator_id: collaboratorId, date, check_in: checkIn, check_out: checkOut })
				.select()
				.single();
			if (data) this.list.push(data);
		}
	}
}

export const fixedAttendance = new FixedAttendanceStore();
