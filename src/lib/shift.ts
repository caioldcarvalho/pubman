// Janela de funcionamento da Ludens por dia da semana (day_of_week: 0=dom ... 6=sáb,
// igual ao Date.getDay() — é o mesmo valor já salvo em schedule_dates.day_of_week).
// Segunda (1) fica de fora: a casa não abre.

export interface ShiftWindow {
	start: string; // 'HH:MM'
	end: string; // 'HH:MM' — pode ser menor que start (vira dia seguinte, ex: sexta/sábado)
	hours: number;
}

const SHIFT_BY_DAY_OF_WEEK: Partial<Record<number, ShiftWindow>> = {
	0: { start: '17:00', end: '21:00', hours: 4 }, // domingo
	2: { start: '18:30', end: '23:30', hours: 5 }, // terça
	3: { start: '18:30', end: '23:30', hours: 5 }, // quarta
	4: { start: '18:30', end: '23:30', hours: 5 }, // quinta
	5: { start: '18:30', end: '01:00', hours: 6.5 }, // sexta
	6: { start: '18:30', end: '01:00', hours: 6.5 }, // sábado
};

export function getShiftWindow(dayOfWeek: number | null | undefined): ShiftWindow | null {
	if (dayOfWeek === null || dayOfWeek === undefined) return null;
	return SHIFT_BY_DAY_OF_WEEK[dayOfWeek] ?? null;
}

function toMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
}

/** Duração bruta batida no ponto (entrada até saída), sem relação com o turno esperado. Usado só pra exibição. */
export function getHoursWorked(checkIn: string | null, checkOut: string | null): number | null {
	if (!checkIn || !checkOut) return null;
	let diff = toMinutes(checkOut) - toMinutes(checkIn);
	if (diff < 0) diff += 24 * 60; // virou o dia
	return diff / 60;
}

/**
 * Valor efetivo da noite: `rate` é o valor cheio (já considerando rate_override, se houver).
 * Se houver ponto batido (check_in/check_out) e um turno conhecido pro dia da semana,
 * desconta proporcionalmente por atraso e/ou saída antecipada — a sobreposição entre o
 * horário batido e a janela do turno é o que conta, então chegar cedo ou sair depois do
 * horário não gera bônus (trava em 100% do valor).
 * Sem ponto batido ou sem turno definido pro dia (ex: evento numa segunda), paga o valor cheio.
 */
export function getEffectiveRate(
	rate: number,
	dayOfWeek: number | null | undefined,
	checkIn: string | null,
	checkOut: string | null,
): number {
	if (!checkIn || !checkOut) return rate;

	const shift = getShiftWindow(dayOfWeek);
	if (!shift) return rate;

	const shiftStart = toMinutes(shift.start);
	let shiftEnd = toMinutes(shift.end);
	if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;

	let inMin = toMinutes(checkIn);
	let outMin = toMinutes(checkOut);
	if (outMin <= inMin) outMin += 24 * 60;

	const overlapStart = Math.max(inMin, shiftStart);
	const overlapEnd = Math.min(outMin, shiftEnd);
	const overlapMinutes = Math.max(0, overlapEnd - overlapStart);

	const shiftMinutes = shiftEnd - shiftStart;
	if (shiftMinutes <= 0) return rate;

	const fraction = Math.min(1, overlapMinutes / shiftMinutes);
	return rate * fraction;
}

/**
 * Minutos "perdidos" do turno: atraso na entrada + antecipação na saída,
 * comparado à janela esperada pro dia da semana. Não mexe em valor/pagamento —
 * serve só pra acompanhamento de assiduidade (ex: colaborador fixo).
 * Sem ponto batido ou sem turno definido pro dia, retorna 0.
 */
export function getShortfallMinutes(
	dayOfWeek: number | null | undefined,
	checkIn: string | null,
	checkOut: string | null,
): number {
	if (!checkIn || !checkOut) return 0;

	const shift = getShiftWindow(dayOfWeek);
	if (!shift) return 0;

	const shiftStart = toMinutes(shift.start);
	let shiftEnd = toMinutes(shift.end);
	if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;

	let inMin = toMinutes(checkIn);
	let outMin = toMinutes(checkOut);
	if (outMin <= inMin) outMin += 24 * 60;

	const lateMinutes = Math.max(0, inMin - shiftStart);
	const earlyMinutes = Math.max(0, shiftEnd - outMin);
	return lateMinutes + earlyMinutes;
}
