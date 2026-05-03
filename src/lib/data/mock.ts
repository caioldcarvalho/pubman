export interface Collaborator {
	id: string;
	name: string;
	role: 'instrutor' | 'garcom' | 'ambos';
	baseRate: number;
	stars: number;
	active: boolean;
}

export interface ConsumptionEntry {
	id: string;
	collaboratorId: string;
	productId: string;
	quantity: number;
	date: string; // ISO date
	createdAt: string;
}

export interface SchedulePeriod {
	id: string;
	startDate: string;
	endDate: string;
	createdAt: string;
}

export interface ScheduleDate {
	id: string;
	periodId: string;
	date: string;
	dayOfWeek: number; // 0=dom, 5=sex, 6=sab
	requiredCount: number;
}

export interface Availability {
	id: string;
	dateId: string;
	collaboratorId: string;
	available: boolean;
}

export interface Assignment {
	id: string;
	dateId: string;
	collaboratorId: string;
	rateOverride: number | null;
	notes: string;
}

export interface Purchase {
	id: string;
	amount: number;
	date: string;
	notes: string;
	reimbursed: boolean;
	createdAt: string;
}

export const mockCollaborators: Collaborator[] = [
	{ id: 'col1', name: 'Gui', role: 'ambos', baseRate: 150, stars: 4, active: true },
	{ id: 'col2', name: 'Ana', role: 'ambos', baseRate: 150, stars: 5, active: true },
	{ id: 'col3', name: 'Pedro', role: 'instrutor', baseRate: 160, stars: 3, active: true },
	{ id: 'col4', name: 'Julia', role: 'garcom', baseRate: 130, stars: 4, active: true },
	{ id: 'col5', name: 'Lucas', role: 'ambos', baseRate: 150, stars: 3, active: true },
	{ id: 'col6', name: 'Marina', role: 'ambos', baseRate: 150, stars: 5, active: true },
	{ id: 'col7', name: 'Rafael', role: 'instrutor', baseRate: 170, stars: 4, active: true },
	{ id: 'col8', name: 'Camila', role: 'ambos', baseRate: 140, stars: 2, active: true },
];

export const mockConsumption: ConsumptionEntry[] = [
	{ id: 'cons1', collaboratorId: 'col1', productId: 'b1', quantity: 2, date: '2026-05-02', createdAt: '2026-05-02T20:00:00' },
	{ id: 'cons2', collaboratorId: 'col1', productId: 'p2', quantity: 1, date: '2026-05-02', createdAt: '2026-05-02T21:00:00' },
	{ id: 'cons3', collaboratorId: 'col2', productId: 'b2', quantity: 1, date: '2026-05-02', createdAt: '2026-05-02T20:30:00' },
	{ id: 'cons4', collaboratorId: 'col3', productId: 'd6', quantity: 1, date: '2026-05-03', createdAt: '2026-05-03T19:00:00' },
	{ id: 'cons5', collaboratorId: 'col5', productId: 'b5', quantity: 3, date: '2026-05-03', createdAt: '2026-05-03T20:00:00' },
];

export const mockPurchases: Purchase[] = [
	{ id: 'pur1', amount: 245.5, date: '2026-04-28', notes: 'Gelo e descartáveis', reimbursed: false, createdAt: '2026-04-28T10:00:00' },
	{ id: 'pur2', amount: 89.9, date: '2026-04-30', notes: 'Guardanapos e canudos', reimbursed: false, createdAt: '2026-04-30T14:00:00' },
	{ id: 'pur3', amount: 320.0, date: '2026-05-01', notes: 'Frutas para drinks', reimbursed: true, createdAt: '2026-05-01T09:00:00' },
];
