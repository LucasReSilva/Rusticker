export interface ProcessingHistoryRecord {
	id: string;
	completedAt: number;
	width: number;
	height: number;
	background: { r: number; g: number; b: number };
	tolerance: number;
	stickerCount: number;
	fingerprint?: string;
}

export interface ProcessingHistoryEntry extends ProcessingHistoryRecord {
	previouslyProcessed: boolean;
}

export type HistoryResult<T> = { ok: true; value: T } | { ok: false };

const databaseName = 'rusticker-processing-history';
const storeName = 'runs';
const enabledKey = 'rusticker-processing-history-enabled';
const createdKey = 'rusticker-processing-history-created';
const maximumEntries = 50;
const retentionMs = 90 * 24 * 60 * 60 * 1000;
const maximumHashBytes = 32 * 1024 * 1024;

function isEnabled(): boolean {
	try {
		return globalThis.localStorage?.getItem(enabledKey) === 'true';
	} catch {
		return false;
	}
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!globalThis.indexedDB) {
			reject(new Error('StorageUnavailable'));
			return;
		}
		const request = indexedDB.open(databaseName, 1);
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(storeName)) {
				const store = database.createObjectStore(storeName, { keyPath: 'id' });
				store.createIndex('completedAt', 'completedAt');
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
		request.onblocked = () => reject(new Error('StorageBlocked'));
	});
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function prune(store: IDBObjectStore, now: number, limit = maximumEntries): Promise<void> {
	const rows = (await requestValue(store.getAll())) as ProcessingHistoryRecord[];
	const keep = new Set(retainedHistoryRows(rows, now, limit).map((row) => row.id));
	for (const row of rows) {
		if (!keep.has(row.id)) store.delete(row.id);
	}
}

export function retainedHistoryRows(
	rows: ProcessingHistoryRecord[],
	now: number,
	limit = maximumEntries
): ProcessingHistoryRecord[] {
	return rows
		.filter((row) => row.completedAt >= now - retentionMs)
		.sort((left, right) => right.completedAt - left.completedAt)
		.slice(0, limit);
}

export function annotatePreviousRuns(rows: ProcessingHistoryRecord[]): ProcessingHistoryEntry[] {
	const seen = new Set<string>();
	return [...rows]
		.sort((left, right) => left.completedAt - right.completedAt)
		.map((row) => {
			const previouslyProcessed = !!row.fingerprint && seen.has(row.fingerprint);
			if (row.fingerprint) seen.add(row.fingerprint);
			return { ...row, previouslyProcessed };
		})
		.reverse();
}

export async function fingerprint(file: Blob): Promise<string | undefined> {
	if (file.size > maximumHashBytes || !globalThis.crypto?.subtle) return undefined;
	try {
		const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
		return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
			''
		);
	} catch {
		return undefined;
	}
}

function createId(): string {
	return (
		globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
	);
}

export function createProcessingHistoryRecord(
	input: {
		file: Blob;
		width: number;
		height: number;
		background: { r: number; g: number; b: number };
		tolerance: number;
		stickerCount: number;
	},
	digest?: string,
	completedAt = Date.now()
): ProcessingHistoryRecord {
	return {
		id: createId(),
		completedAt,
		width: input.width,
		height: input.height,
		background: { ...input.background },
		tolerance: input.tolerance,
		stickerCount: input.stickerCount,
		...(digest ? { fingerprint: digest } : {})
	};
}

/** Enables recording only after the user has seen the localized explanation. */
export async function enableProcessingHistory(): Promise<boolean> {
	try {
		const database = await openDatabase();
		database.close();
		localStorage.setItem(createdKey, 'true');
		localStorage.setItem(enabledKey, 'true');
		return true;
	} catch {
		return false;
	}
}

export function disableProcessingHistory(): void {
	try {
		localStorage.removeItem(enabledKey);
	} catch {
		// A failed preference write must not affect image processing.
	}
}

export function processingHistoryEnabled(): boolean {
	return isEnabled();
}

/** Writes only a bounded summary. All failures are returned to the caller, never thrown. */
export async function recordProcessingRun(input: {
	file: Blob;
	width: number;
	height: number;
	background: { r: number; g: number; b: number };
	tolerance: number;
	stickerCount: number;
}): Promise<'saved' | 'disabled' | 'unavailable'> {
	if (!isEnabled()) return 'disabled';
	let database: IDBDatabase | undefined;
	try {
		const digest = await fingerprint(input.file);
		if (!isEnabled()) return 'disabled';
		database = await openDatabase();
		const transaction = database.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);
		const now = Date.now();
		// Leave room for the new run so the database never exceeds its bound.
		await prune(store, now, maximumEntries - 1);
		const record = createProcessingHistoryRecord(input, digest, now);
		store.add(record);
		await new Promise<void>((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
		return 'saved';
	} catch {
		return 'unavailable';
	} finally {
		database?.close();
	}
}

export async function listProcessingHistory(): Promise<HistoryResult<ProcessingHistoryEntry[]>> {
	try {
		if (globalThis.localStorage?.getItem(createdKey) !== 'true') return { ok: true, value: [] };
	} catch {
		return { ok: false };
	}
	let database: IDBDatabase | undefined;
	try {
		database = await openDatabase();
		const transaction = database.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);
		await prune(store, Date.now());
		const rows = (await requestValue(store.getAll())) as ProcessingHistoryRecord[];
		await new Promise<void>((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
		return { ok: true, value: annotatePreviousRuns(rows) };
	} catch {
		return { ok: false };
	} finally {
		database?.close();
	}
}

export async function deleteProcessingHistoryEntry(id: string): Promise<boolean> {
	try {
		if (globalThis.localStorage?.getItem(createdKey) !== 'true') return true;
	} catch {
		return false;
	}
	let database: IDBDatabase | undefined;
	try {
		database = await openDatabase();
		const transaction = database.transaction(storeName, 'readwrite');
		transaction.objectStore(storeName).delete(id);
		await new Promise<void>((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
		return true;
	} catch {
		return false;
	} finally {
		database?.close();
	}
}

export async function clearProcessingHistory(): Promise<boolean> {
	try {
		if (globalThis.localStorage?.getItem(createdKey) !== 'true') return true;
	} catch {
		return false;
	}
	let database: IDBDatabase | undefined;
	try {
		database = await openDatabase();
		const transaction = database.transaction(storeName, 'readwrite');
		transaction.objectStore(storeName).clear();
		await new Promise<void>((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
		return true;
	} catch {
		return false;
	} finally {
		database?.close();
	}
}
