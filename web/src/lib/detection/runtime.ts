// The request pipeline shared by the real and the mock detector: option
// validation, latest-wins scheduling, error mapping, sticker building, and
// disposal. Only the job executor differs.
import { toDetectionError } from './errors';
import { createLatestWins } from './latest';
import { toEngineOptions, type EngineOptions } from './options';
import type { WorkerResult } from './protocol';
import { toStickers } from './stickers';
import { DetectionError, type DetectInput, type Detector } from './types';

/** One validated job: the caller's image (not copied yet) and engine options. */
export interface Job extends EngineOptions {
	image: DetectInput;
}

/** Builds a `Detector` around `execute`; `onDispose` releases its resources. */
export function createRuntime(
	execute: (job: Job) => Promise<WorkerResult>,
	onDispose: () => void = () => {}
): Detector {
	const scheduler = createLatestWins<Job, WorkerResult>(execute);
	let disposed = false;

	return {
		async detect(image, options) {
			if (disposed) throw new DetectionError('WorkerFailed');
			const result = await scheduler.run({ image, ...toEngineOptions(options) });
			if (!result.ok) throw toDetectionError(result);
			return toStickers(result.stickers);
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			scheduler.dispose();
			onDispose();
		}
	};
}
