function tlv(id: string, value: string): string {
	const len = value.length.toString().padStart(2, '0');
	return `${id}${len}${value}`;
}

function crc16(payload: string): string {
	let crc = 0xffff;
	for (let i = 0; i < payload.length; i++) {
		crc ^= payload.charCodeAt(i) << 8;
		for (let j = 0; j < 8; j++) {
			crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
			crc &= 0xffff;
		}
	}
	return crc.toString(16).toUpperCase().padStart(4, '0');
}

function sanitize(str: string, max: number): string {
	return str
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-zA-Z0-9 ]/g, '')
		.trim()
		.slice(0, max);
}

/**
 * Normaliza a chave PIX para o formato exato que o BACEN/bancos esperam no
 * BR Code. A maior causa de "PIX recusado" é a chave salva com pontuação
 * (CPF "123.456.789-00", telefone "(11) 99999-9999") — aqui ela é limpa.
 *
 * Regras:
 *  - e-mail            → minúsculo, sem espaços
 *  - chave aleatória   → mantém (UUID com hífens), só tira espaços
 *  - telefone (com +)  → "+" seguido só de dígitos
 *  - CPF (11 díg)      → só dígitos
 *  - CNPJ (14 díg)     → só dígitos
 *  - telefone BR (10/11 díg, sem +) → "+55" + dígitos
 */
export function normalizePixKey(raw: string): string {
	const key = (raw ?? '').trim();
	if (!key) return key;

	// E-mail
	if (key.includes('@')) return key.toLowerCase().replace(/\s+/g, '');

	// Chave aleatória (contém letras e não é e-mail): mantém como está
	if (/[a-zA-Z]/.test(key)) return key.replace(/\s+/g, '');

	const hasPlus = key.startsWith('+');
	const digits = key.replace(/\D/g, '');

	// Já veio com código de país (ex: +55 11 99999-9999)
	if (hasPlus) return '+' + digits;

	// CPF (11) e CNPJ (14) vão só com dígitos
	if (digits.length === 11 || digits.length === 14) return digits;

	// Telefone brasileiro sem código de país (DDD + número)
	if (digits.length === 10 || digits.length === 9) return '+55' + digits;

	// Não reconhecido: devolve só os dígitos (melhor que pontuação)
	return digits || key;
}

export type PixKeyType = 'telefone' | 'cpf' | 'cnpj' | 'email' | 'aleatoria';

export const PIX_KEY_TYPES: { value: PixKeyType; label: string }[] = [
	{ value: 'telefone', label: 'Telefone' },
	{ value: 'cpf', label: 'CPF' },
	{ value: 'cnpj', label: 'CNPJ' },
	{ value: 'email', label: 'E-mail' },
	{ value: 'aleatoria', label: 'Aleatória' },
];

/** Formata a chave no formato canônico do PIX a partir de um tipo escolhido pelo usuário. */
export function formatPixKeyByType(raw: string, type: PixKeyType): string {
	const key = (raw ?? '').trim();
	if (!key) return key;
	switch (type) {
		case 'email':
			return key.toLowerCase().replace(/\s+/g, '');
		case 'aleatoria':
			return key.replace(/\s+/g, '');
		case 'cpf':
		case 'cnpj':
			return key.replace(/\D/g, '');
		case 'telefone': {
			const d = key.replace(/\D/g, '');
			if (key.startsWith('+')) return '+' + d;
			if (d.startsWith('55') && d.length >= 12) return '+' + d; // já tem código do país
			return '+55' + d;
		}
	}
}

/** Adivinha o tipo de uma chave já salva, para pré-selecionar o select ao editar. */
export function inferPixKeyType(key: string): PixKeyType {
	const k = (key ?? '').trim();
	if (k.includes('@')) return 'email';
	if (/[a-zA-Z]/.test(k)) return 'aleatoria';
	const digits = k.replace(/\D/g, '');
	if (k.startsWith('+') || digits.length >= 12) return 'telefone';
	if (digits.length === 14) return 'cnpj';
	return 'cpf';
}

export function buildPixBRCode(opts: {
	pixKey: string;
	amount: number;
	merchantName: string;
	merchantCity?: string;
	txid?: string;
}): string {
	const key = normalizePixKey(opts.pixKey);
	const amount = opts.amount > 0 ? opts.amount.toFixed(2) : '';
	const name = sanitize(opts.merchantName || 'PAGAMENTO', 25) || 'PAGAMENTO';
	const city = sanitize(opts.merchantCity || 'BRASIL', 15) || 'BRASIL';
	const txid = sanitize(opts.txid || '***', 25) || '***';

	const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
	const additionalData = tlv('05', txid);

	let payload =
		tlv('00', '01') +
		tlv('26', merchantAccount) +
		tlv('52', '0000') +
		tlv('53', '986') +
		(amount ? tlv('54', amount) : '') +
		tlv('58', 'BR') +
		tlv('59', name) +
		tlv('60', city) +
		tlv('62', additionalData);

	payload += '6304';
	return payload + crc16(payload);
}
