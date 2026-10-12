import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
	createProcessingHistoryRecord,
	enableProcessingHistory,
	fingerprint,
	listProcessingHistory,
	annotatePreviousRuns,
	processingHistoryEnabled,
	recordProcessingRun,
	retainedHistoryRows
} from './store';

const run = {
	file: new Blob(['private image bytes'], { type: 'image/png' }),
	width: 120,
	height: 80,
	background: { r: 0, g: 177, b: 64 },
	tolerance: 50,
	stickerCount: 3
};

let values: Map<string, string>;

beforeEach(() => {
	values = new Map();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key)
	});
	vi.stubGlobal('indexedDB', undefined);
});

afterEach(() => vi.unstubAllGlobals());

describe('processing history storage boundary', () => {
	it('defaults to off and does not open storage or record a selected file', async () => {
		const open = vi.fn();
		vi.stubGlobal('indexedDB', { open });

		expect(processingHistoryEnabled()).toBe(false);
		expect(await recordProcessingRun(run)).toBe('disabled');
		expect(open).not.toHaveBeenCalled();
		expect(await listProcessingHistory()).toEqual({ ok: true, value: [] });
		expect(open).not.toHaveBeenCalled();
	});

	it('leaves history disabled when IndexedDB is unavailable', async () => {
		expect(await enableProcessingHistory()).toBe(false);
		expect(processingHistoryEnabled()).toBe(false);
	});

	it('reports storage failure without throwing or retaining image bytes', async () => {
		values.set('rusticker-processing-history-enabled', 'true');
		expect(await recordProcessingRun(run)).toBe('unavailable');
	});

	it('hashes exact file bytes and builds a metadata-only history row', async () => {
		const digest = await fingerprint(run.file);
		const expected = createHash('sha256').update(Buffer.from('private image bytes')).digest('hex');
		const record = createProcessingHistoryRecord(
			{ ...run, fileName: 'secret-name.png' } as typeof run,
			digest,
			1234
		);

		expect(digest).toBe(expected);
		expect(record).toMatchObject({
			completedAt: 1234,
			width: 120,
			height: 80,
			fingerprint: expected
		});
		expect(Object.keys(record).sort()).toEqual(
			['id', 'completedAt', 'width', 'height', 'background', 'tolerance', 'stickerCount', 'fingerprint'].sort()
		);
		expect(JSON.stringify(record)).not.toContain('secret-name.png');
		expect(JSON.stringify(record)).not.toContain('private image bytes');
	});

	it('keeps the summary when Web Crypto is unavailable', async () => {
		vi.stubGlobal('crypto', { subtle: undefined });
		expect(await fingerprint(run.file)).toBeUndefined();
		expect(createProcessingHistoryRecord(run, undefined, 1234)).toMatchObject({
			completedAt: 1234,
			stickerCount: 3
		});
	});

	it('keeps only the 50 newest unexpired summaries', () => {
		const now = Date.now();
		const rows = Array.from({ length: 52 }, (_, index) => ({
			id: `run-${index}`,
			completedAt: now - index * 1000,
			width: 1,
			height: 1,
			background: { r: 0, g: 0, b: 0 },
			tolerance: 0,
			stickerCount: 0
		}));
		rows.push({ ...rows[0], id: 'expired', completedAt: now - 91 * 24 * 60 * 60 * 1000 });

		const retained = retainedHistoryRows(rows, now);

		expect(retained).toHaveLength(50);
		expect(retained[0]?.id).toBe('run-0');
		expect(retained.some((row) => row.id === 'expired')).toBe(false);
		expect(retained.some((row) => row.id === 'run-50')).toBe(false);
	});

	it('marks exact-file repeats without exposing their fingerprint in display fields', () => {
		const rows = [
			{ id: 'earlier', completedAt: 1, fingerprint: 'secret', ...runSummary() },
			{ id: 'later', completedAt: 2, fingerprint: 'secret', ...runSummary() },
			{ id: 'unknown', completedAt: 3, ...runSummary() }
		];

		const entries = annotatePreviousRuns(rows);

		expect(entries.map((entry) => [entry.id, entry.previouslyProcessed])).toEqual([
			['unknown', false],
			['later', true],
			['earlier', false]
		]);
	});
});

function runSummary() {
	return {
		width: 1,
		height: 1,
		background: { r: 0, g: 0, b: 0 },
		tolerance: 0,
		stickerCount: 0
	};
}
