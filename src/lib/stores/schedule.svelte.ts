import { supabase } from '$lib/supabase';

export interface SchedulePeriod {
	id: string;
	start_date: string;
	end_date: string;
	created_at: string;
}

export interface ScheduleDate {
	id: string;
	period_id: string;
	date: string;
	day_of_week: number;
	required_count: number;
}

export interface Availability {
	id: string;
	date_id: string;
	collaborator_id: string;
	available: boolean;
}

export interface Assignment {
	id: string;
	date_id: string;
	collaborator_id: string;
	rate_override: number | null;
	notes: string;
}

class ScheduleStore {
	periods = $state<SchedulePeriod[]>([]);
	dates = $state<ScheduleDate[]>([]);
	availability = $state<Availability[]>([]);
	assignments = $state<Assignment[]>([]);
	loaded = $state(false);

	// Pre-computed lookup maps
	private _datesByPeriod = $derived(() => {
		const map = new Map<string, ScheduleDate[]>();
		for (const d of this.dates) {
			const arr = map.get(d.period_id);
			if (arr) arr.push(d);
			else map.set(d.period_id, [d]);
		}
		return map;
	});

	private _availByDate = $derived(() => {
		const map = new Map<string, Availability[]>();
		for (const a of this.availability) {
			const arr = map.get(a.date_id);
			if (arr) arr.push(a);
			else map.set(a.date_id, [a]);
		}
		return map;
	});

	private _assignByDate = $derived(() => {
		const map = new Map<string, Assignment[]>();
		for (const a of this.assignments) {
			const arr = map.get(a.date_id);
			if (arr) arr.push(a);
			else map.set(a.date_id, [a]);
		}
		return map;
	});

	private _dateById = $derived(new Map(this.dates.map((d) => [d.id, d])));

	async load() {
		const [pRes, dRes, aRes, asRes] = await Promise.all([
			supabase.from('schedule_periods').select('*').order('start_date', { ascending: false }),
			supabase.from('schedule_dates').select('*').order('date'),
			supabase.from('availability').select('*'),
			supabase.from('assignments').select('*'),
		]);
		if (pRes.data) this.periods = pRes.data;
		if (dRes.data) this.dates = dRes.data;
		if (aRes.data) this.availability = aRes.data;
		if (asRes.data) this.assignments = asRes.data;
		this.loaded = true;
	}

	getDatesByPeriod(periodId: string): ScheduleDate[] {
		return this._datesByPeriod().get(periodId) ?? [];
	}

	getAvailability(dateId: string): Availability[] {
		return this._availByDate().get(dateId) ?? [];
	}

	getAvailableCollaborators(dateId: string): Availability[] {
		return (this._availByDate().get(dateId) ?? []).filter((a) => a.available);
	}

	getAssignments(dateId: string): Assignment[] {
		return this._assignByDate().get(dateId) ?? [];
	}

	getDateById(dateId: string): ScheduleDate | undefined {
		return this._dateById.get(dateId);
	}

	getAssignmentCountByCollaborator(periodId: string): Map<string, number> {
		const periodDateIds = new Set(this.dates.filter((d) => d.period_id === periodId).map((d) => d.id));
		const counts = new Map<string, number>();
		for (const a of this.assignments) {
			if (periodDateIds.has(a.date_id)) {
				counts.set(a.collaborator_id, (counts.get(a.collaborator_id) ?? 0) + 1);
			}
		}
		return counts;
	}

	isAssigned(dateId: string, collaboratorId: string) {
		return this.assignments.some((a) => a.date_id === dateId && a.collaborator_id === collaboratorId);
	}

	async setAvailability(dateId: string, collaboratorId: string, available: boolean) {
		const existing = this.availability.find((a) => a.date_id === dateId && a.collaborator_id === collaboratorId);
		if (existing) {
			await supabase.from('availability').update({ available }).eq('id', existing.id);
			existing.available = available;
		} else {
			const { data } = await supabase
				.from('availability')
				.insert({ date_id: dateId, collaborator_id: collaboratorId, available })
				.select()
				.single();
			if (data) this.availability.push(data);
		}
	}

	async toggleAssignment(dateId: string, collaboratorId: string) {
		const idx = this.assignments.findIndex((a) => a.date_id === dateId && a.collaborator_id === collaboratorId);
		if (idx >= 0) {
			await supabase.from('assignments').delete().eq('id', this.assignments[idx].id);
			this.assignments.splice(idx, 1);
		} else {
			const { data } = await supabase
				.from('assignments')
				.insert({ date_id: dateId, collaborator_id: collaboratorId })
				.select()
				.single();
			if (data) this.assignments.push(data);
		}
	}

	async addPeriod(startDate: string, endDate: string, extraDates: string[] = []): Promise<string> {
		const { data: period } = await supabase
			.from('schedule_periods')
			.insert({ start_date: startDate, end_date: endDate })
			.select()
			.single();

		if (!period) throw new Error('Failed to create period');
		this.periods.unshift(period);

		// Generate weekend dates
		const newDates: Omit<ScheduleDate, 'id'>[] = [];
		const generatedDateStrs = new Set<string>();
		const start = new Date(startDate + 'T12:00:00');
		const end = new Date(endDate + 'T12:00:00');
		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			const dow = d.getDay();
			if (dow === 5 || dow === 6) {
				const dateStr = d.toISOString().split('T')[0];
				generatedDateStrs.add(dateStr);
				newDates.push({
					period_id: period.id,
					date: dateStr,
					day_of_week: dow,
					required_count: dow === 6 ? 3 : 1,
				});
			}
		}

		// Add extra dates (events, special days)
		for (const dateStr of extraDates) {
			if (!generatedDateStrs.has(dateStr)) {
				const d = new Date(dateStr + 'T12:00:00');
				newDates.push({
					period_id: period.id,
					date: dateStr,
					day_of_week: d.getDay(),
					required_count: 1,
				});
			}
		}

		if (newDates.length > 0) {
			const { data: insertedDates } = await supabase.from('schedule_dates').insert(newDates).select();
			if (insertedDates) this.dates.push(...insertedDates);
		}

		return period.id;
	}

	getPastAssignments(collaboratorId: string, today: string): Assignment[] {
		return this.assignments.filter((a) => {
			if (a.collaborator_id !== collaboratorId) return false;
			const schedDate = this._dateById.get(a.date_id);
			return schedDate && schedDate.date <= today;
		});
	}

	async deletePeriod(periodId: string) {
		await supabase.from('schedule_periods').delete().eq('id', periodId);
		const dateIds = new Set(this.dates.filter((d) => d.period_id === periodId).map((d) => d.id));
		this.periods = this.periods.filter((p) => p.id !== periodId);
		this.dates = this.dates.filter((d) => d.period_id !== periodId);
		this.availability = this.availability.filter((a) => !dateIds.has(a.date_id));
		this.assignments = this.assignments.filter((a) => !dateIds.has(a.date_id));
	}

	async updatePeriod(periodId: string, startDate: string, endDate: string, extraDates: string[] = []) {
		await supabase.from('schedule_periods').update({ start_date: startDate, end_date: endDate }).eq('id', periodId);

		// Delete old dates (cascade clears availability/assignments in DB)
		const oldDateIds = this.dates.filter((d) => d.period_id === periodId).map((d) => d.id);
		if (oldDateIds.length) {
			await supabase.from('schedule_dates').delete().in('id', oldDateIds);
		}

		// Regenerate dates
		const newDates: Omit<ScheduleDate, 'id'>[] = [];
		const generatedDateStrs = new Set<string>();
		const start = new Date(startDate + 'T12:00:00');
		const end = new Date(endDate + 'T12:00:00');
		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			const dow = d.getDay();
			if (dow === 5 || dow === 6) {
				const dateStr = d.toISOString().split('T')[0];
				generatedDateStrs.add(dateStr);
				newDates.push({
					period_id: periodId,
					date: dateStr,
					day_of_week: dow,
					required_count: dow === 6 ? 3 : 1,
				});
			}
		}

		for (const dateStr of extraDates) {
			if (!generatedDateStrs.has(dateStr)) {
				const d = new Date(dateStr + 'T12:00:00');
				newDates.push({
					period_id: periodId,
					date: dateStr,
					day_of_week: d.getDay(),
					required_count: 1,
				});
			}
		}

		// Update local state
		const period = this.periods.find((p) => p.id === periodId);
		if (period) { period.start_date = startDate; period.end_date = endDate; }
		const oldSet = new Set(oldDateIds);
		this.dates = this.dates.filter((d) => !oldSet.has(d.id));
		this.availability = this.availability.filter((a) => !oldSet.has(a.date_id));
		this.assignments = this.assignments.filter((a) => !oldSet.has(a.date_id));

		if (newDates.length > 0) {
			const { data: insertedDates } = await supabase.from('schedule_dates').insert(newDates).select();
			if (insertedDates) this.dates.push(...insertedDates);
		}
	}

	async updateAssignmentRate(assignmentId: string, rateOverride: number | null) {
		await supabase.from('assignments').update({ rate_override: rateOverride }).eq('id', assignmentId);
		const a = this.assignments.find((a) => a.id === assignmentId);
		if (a) a.rate_override = rateOverride;
	}

	async clearAssignmentsForCollaborator(collaboratorId: string) {
		const ids = this.assignments.filter((a) => a.collaborator_id === collaboratorId).map((a) => a.id);
		if (ids.length > 0) {
			await supabase.from('assignments').delete().in('id', ids);
			this.assignments = this.assignments.filter((a) => a.collaborator_id !== collaboratorId);
		}
	}
}

export const schedule = new ScheduleStore();
