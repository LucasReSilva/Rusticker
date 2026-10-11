import { describe, expect, it } from 'vitest';
import { createLatestWins } from './latest';
import { isCancelled } from './types';

/** A job the test finishes by hand. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function harness() {
	const started: string[] = [];
	const jobs = new Map<string, ReturnType<typeof deferred<string>>>();
	const scheduler = createLatestWins<string, string>((request) => {
		started.push(request);
		const job = deferred<string>();
		jobs.set(request, job);
		return job.promise;
	});
	return { scheduler, started, jobs };
}

const settle = <T>(promise: Promise<T>) =>
	promise.then(
		(value) => ({ status: 'resolved' as const, value }),
		(reason: unknown) => ({ status: 'rejected' as const, reason })
	);

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createLatestWins', () => {
	it('runs a single request', async () => {
		const { scheduler, jobs } = harness();
		const result = scheduler.run('a');
		await tick();
		jobs.get('a')!.resolve('A');
		await expect(result).resolves.toBe('A');
	});

	it('with three rapid calls only the third resolves and the second never starts', async () => {
		const { scheduler, started, jobs } = harness();
		const first = settle(scheduler.run('1'));
		const second = settle(scheduler.run('2'));
		const third = settle(scheduler.run('3'));

		// Superseded callers are not kept waiting for the running job.
		const [r1, r2] = await Promise.all([first, second]);
		expect(r1.status).toBe('rejected');
		expect(r2.status).toBe('rejected');
		expect(isCancelled(r1.status === 'rejected' ? r1.reason : null)).toBe(true);
		expect(isCancelled(r2.status === 'rejected' ? r2.reason : null)).toBe(true);
		expect(started).toEqual(['1']);

		jobs.get('1')!.resolve('stale');
		await tick();
		expect(started).toEqual(['1', '3']);
		jobs.get('3')!.resolve('fresh');
		await expect(third).resolves.toEqual({ status: 'resolved', value: 'fresh' });
		expect(started).not.toContain('2');
	});

	it('drops a stale result that arrives late', async () => {
		const { scheduler, jobs } = harness();
		const stale = settle(scheduler.run('old'));
		await tick();
		const fresh = scheduler.run('new');
		const staleOutcome = await stale;
		expect(staleOutcome.status).toBe('rejected');

		jobs.get('old')!.resolve('OLD');
		await tick();
		// The stale value is never delivered, only the new request's.
		jobs.get('new')!.resolve('NEW');
		await expect(fresh).resolves.toBe('NEW');
		expect(await stale).toEqual(staleOutcome);
	});

	it('drops a stale failure too', async () => {
		const { scheduler, jobs } = harness();
		const stale = settle(scheduler.run('old'));
		const fresh = scheduler.run('new');
		jobs.get('old')!.reject(new Error('boom'));
		const outcome = await stale;
		expect(outcome.status === 'rejected' && isCancelled(outcome.reason)).toBe(true);
		await tick();
		jobs.get('new')!.resolve('NEW');
		await expect(fresh).resolves.toBe('NEW');
	});

	it('passes a failure of the current request through', async () => {
		const { scheduler, jobs } = harness();
		const result = scheduler.run('a');
		await tick();
		const error = new Error('fail');
		jobs.get('a')!.reject(error);
		await expect(result).rejects.toBe(error);
	});

	it('treats a synchronous throw from the executor as a failure', async () => {
		const scheduler = createLatestWins<string, string>(() => {
			throw new Error('sync');
		});
		await expect(scheduler.run('a')).rejects.toThrow('sync');
		// The scheduler is still usable afterwards.
		await expect(scheduler.run('b')).rejects.toThrow('sync');
	});

	it('dispose cancels in-flight and pending work and starts nothing else', async () => {
		const { scheduler, started, jobs } = harness();
		const running = settle(scheduler.run('1'));
		const pending = settle(scheduler.run('2'));
		scheduler.dispose();
		const [a, b] = await Promise.all([running, pending]);
		expect(a.status === 'rejected' && isCancelled(a.reason)).toBe(true);
		expect(b.status === 'rejected' && isCancelled(b.reason)).toBe(true);
		jobs.get('1')!.resolve('late');
		await tick();
		expect(started).toEqual(['1']);

		const after = await settle(scheduler.run('3'));
		expect(after.status === 'rejected' && isCancelled(after.reason)).toBe(true);
		expect(started).toEqual(['1']);
	});
});

describe('isCancelled', () => {
	it('recognizes AbortError only', () => {
		expect(isCancelled(new DOMException('x', 'AbortError'))).toBe(true);
		expect(isCancelled(new Error('AbortError'))).toBe(false);
		expect(isCancelled('AbortError')).toBe(false);
		expect(isCancelled(null)).toBe(false);
	});
});
