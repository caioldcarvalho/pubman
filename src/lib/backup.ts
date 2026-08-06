import { supabase } from '$lib/supabase';

const BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;

interface BackupPayload {
	version: number;
	exportedAt: string;
	tables: Record<string, unknown[]>;
}

// ── Crypto helpers (mesmo esquema do dbs-capital: AES-GCM + PBKDF2) ────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
		keyMaterial,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt'],
	);
}

async function encrypt(data: string, password: string): Promise<ArrayBuffer> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(password, salt);
	const enc = new TextEncoder();
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));

	// [salt 16B][iv 12B][ciphertext]
	const result = new Uint8Array(16 + 12 + ciphertext.byteLength);
	result.set(salt, 0);
	result.set(iv, 16);
	result.set(new Uint8Array(ciphertext), 28);
	return result.buffer;
}

async function decrypt(buffer: ArrayBuffer, password: string): Promise<string> {
	const data = new Uint8Array(buffer);
	const salt = data.slice(0, 16);
	const iv = data.slice(16, 28);
	const ciphertext = data.slice(28);
	const key = await deriveKey(password, salt);
	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
	return new TextDecoder().decode(plaintext);
}

// ── Ordem das tabelas (pais antes de filhos, por causa das FKs) ────────────
// payments antes de assignments/consumption/purchases porque elas têm payment_id -> payments.id.

const TABLES_EXPORT_ORDER = [
	'collaborators',
	'products',
	'payments',
	'schedule_periods',
	'schedule_dates',
	'availability',
	'assignments',
	'consumption',
	'purchases',
	'events',
	'tasks',
];

const TABLES_DELETE_ORDER = [...TABLES_EXPORT_ORDER].reverse();

// ── Export ──────────────────────────────────────────────────────────────────

export async function exportBackup(email: string, password: string): Promise<Blob> {
	// Confirma a senha de login antes de deixar baixar tudo (mesma trava do dbs-capital).
	const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
	if (authError) throw new Error('Senha incorreta.');

	const tables: Record<string, unknown[]> = {};
	for (const table of TABLES_EXPORT_ORDER) {
		const { data, error } = await supabase.from(table).select('*');
		if (error) throw new Error(`Erro ao exportar ${table}: ${error.message}`);
		tables[table] = data || [];
	}

	const payload: BackupPayload = {
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		tables,
	};

	const json = JSON.stringify(payload);
	const encrypted = await encrypt(json, password);
	return new Blob([encrypted], { type: 'application/octet-stream' });
}

// ── Import ──────────────────────────────────────────────────────────────────
// Nota: diferente do dbs-capital, o pubman não tem coluna user_id em nenhuma
// tabela (é um app de gestor único, sem multi-tenancy) — não há ownership pra
// remapear no restore, as linhas voltam exatamente como foram exportadas.

export async function importBackup(
	file: File,
	email: string,
	password: string,
): Promise<{ tablesRestored: number; rowsRestored: number }> {
	const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
	if (authError) throw new Error('Senha incorreta.');

	const buffer = await file.arrayBuffer();
	let json: string;
	try {
		json = await decrypt(buffer, password);
	} catch {
		throw new Error('Não foi possível descriptografar o arquivo. Senha incorreta ou arquivo corrompido.');
	}

	let payload: BackupPayload;
	try {
		payload = JSON.parse(json);
	} catch {
		throw new Error('Arquivo de backup inválido.');
	}

	if (!payload.version || !payload.tables) {
		throw new Error('Formato de backup não reconhecido.');
	}

	for (const table of TABLES_DELETE_ORDER) {
		await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
	}

	let tablesRestored = 0;
	let rowsRestored = 0;

	for (const table of TABLES_EXPORT_ORDER) {
		const rows = payload.tables[table];
		if (!rows || rows.length === 0) continue;

		// Remove created_at pra deixar o banco gerar de novo (evita fuso horário torto).
		const prepared = rows.map((row: any) => {
			const r = { ...row };
			delete r.created_at;
			return r;
		});

		for (let i = 0; i < prepared.length; i += 500) {
			const batch = prepared.slice(i, i + 500);
			const { error } = await supabase.from(table).insert(batch);
			if (error) throw new Error(`Erro ao restaurar ${table}: ${error.message}`);
		}

		tablesRestored++;
		rowsRestored += rows.length;
	}

	return { tablesRestored, rowsRestored };
}
