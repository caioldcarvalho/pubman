// Formatadores Intl instanciados uma vez (criar a cada chamada é caro em listas).
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DM = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const DMY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const WD = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

/** Arredonda para centavos, evitando acúmulo de erro de ponto flutuante em dinheiro. */
export function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value: number): string {
	return BRL.format(value);
}

export function formatDate(dateStr: string): string {
	return DM.format(new Date(dateStr + 'T12:00:00'));
}

export function formatDateFull(dateStr: string): string {
	return DMY.format(new Date(dateStr + 'T12:00:00'));
}

export function getDayName(dateStr: string): string {
	return WD.format(new Date(dateStr + 'T12:00:00'));
}

export function todayISO(): string {
	return new Date().toISOString().split('T')[0];
}

export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
