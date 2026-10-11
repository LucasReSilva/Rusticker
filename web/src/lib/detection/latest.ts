// Latest-wins scheduling (design D4), shared by the real and the mock
// detector so their cancellation semantics are identical.
import { cancelledError } from './types';

interface Entry<Req, Res> {
	request: Req;
	resolve: (value: Res) => void;
	reject: (reason: unknown) => void;
	settled: boolean;
}

export interface LatestWins<Req, Res> {
	/**
	 * Schedules `request`. Resolves or rejects with the job's outcome, unless
	 * a newer `run` (or `dispose`) supersedes it first: then it rejects
	 * immediately with an `AbortError` and its outcome, if any, is dropped.
	 */
	run(request: Req): Promise<Res>;
	/** Cancels the in-flight and pending requests; no further jobs start. */
	dispose(): void;
}

/**
 * Keeps at most one job in flight and at most one pending. A new request
 * cancels both: the pending one is never started, and the in-flight one keeps
 * running (a synchronous wasm call cannot be interrupted) but its outcome is
 * discarded. The newest request starts as soon as the in-flight job ends.
 */
export function createLatestWins<Req, Res>(
	execute: (request: Req) => Promise<Res>
): LatestWins<Req, Res> {
	let inFlight: Entry<Req, Res> | null = null;
	let pending: Entry<Req, Res> | null = null;
	let disposed = false;

	const cancel = (entry: Entry<Req, Res> | null) => {
		if (entry === null || entry.settled) return;
		entry.settled = true;
		entry.reject(cancelledError());
	};

	const start = (entry: Entry<Req, Res>) => {
		inFlight = entry;
		new Promise<Res>((resolve) => resolve(execute(entry.request)))
			.then(
				(value) => {
					if (!entry.settled) {
						entry.settled = true;
						entry.resolve(value);
					}
				},
				(reason: unknown) => {
					if (!entry.settled) {
						entry.settled = true;
						entry.reject(reason);
					}
				}
			)
			.finally(() => {
				inFlight = null;
				const next = pending;
				pending = null;
				if (next !== null && !disposed) start(next);
			});
	};

	return {
		run(request) {
			return new Promise<Res>((resolve, reject) => {
				const entry: Entry<Req, Res> = { request, resolve, reject, settled: false };
				if (disposed) {
					cancel(entry);
				} else if (inFlight === null) {
					start(entry);
				} else {
					cancel(pending);
					cancel(inFlight);
					pending = entry;
				}
			});
		},
		dispose() {
			disposed = true;
			cancel(inFlight);
			cancel(pending);
			pending = null;
		}
	};
}
