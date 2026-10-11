import { describe, expect, it } from 'vitest';

describe('detection module', () => {
	it('can be imported where Worker does not exist (prerender, SSR)', async () => {
		expect(typeof (globalThis as { Worker?: unknown }).Worker).toBe('undefined');
		const detection = await import('./index');
		expect(typeof detection.createDetector).toBe('function');
		expect(typeof detection.createMockDetector).toBe('function');
		expect(typeof detection.detectionErrorMessage).toBe('function');
		expect(typeof detection.isCancelled).toBe('function');
	});
});
