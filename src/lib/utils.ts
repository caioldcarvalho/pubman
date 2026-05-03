export function formatCurrency(value: number): string {
	return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(dateStr: string): string {
	const date = new Date(dateStr + 'T12:00:00');
	return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function formatDateFull(dateStr: string): string {
	const date = new Date(dateStr + 'T12:00:00');
	return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getDayName(dateStr: string): string {
	const date = new Date(dateStr + 'T12:00:00');
	return date.toLocaleDateString('pt-BR', { weekday: 'short' });
}

export function todayISO(): string {
	return new Date().toISOString().split('T')[0];
}

export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
