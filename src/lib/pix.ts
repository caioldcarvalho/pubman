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

export function buildPixBRCode(opts: {
	pixKey: string;
	amount: number;
	merchantName: string;
	merchantCity?: string;
	txid?: string;
}): string {
	const key = opts.pixKey.trim();
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
