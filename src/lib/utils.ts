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

function toLocalISO(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Data de hoje no horário local. `.toISOString()` converte pra UTC antes de
 * cortar a data — como o Brasil é UTC-3, isso faz o "hoje" virar amanhã já às
 * 21h locais (bem no meio do expediente de terça a quinta). Usar os getters
 * locais (getFullYear/getMonth/getDate) evita esse desvio de fuso.
 */
export function todayISO(): string {
	return toLocalISO(new Date());
}

/**
 * Dia "operacional" pra tela de fechamento da noite: entre meia-noite e 6h,
 * ainda conta como o dia anterior, porque sexta e sábado a casa fecha 01h da
 * madrugada. Sem isso, a escala de sexta some da tela assim que vira sábado,
 * antes de dar tempo de bater o ponto de saída de quem tá fechando.
 */
export function operatingDateISO(now: Date = new Date()): string {
	if (now.getHours() < 6) {
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		return toLocalISO(yesterday);
	}
	return toLocalISO(now);
}

export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
