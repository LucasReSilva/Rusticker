import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';

export interface OnnxTensorMetadata {
	dimensions: readonly (number | string)[];
	type: string;
}

export interface OnnxTensor {
	dims: readonly number[];
	data: ArrayLike<number>;
}

export interface OnnxSession {
	inputNames: readonly string[];
	outputNames: readonly string[];
	inputMetadata: readonly OnnxTensorMetadata[];
	outputMetadata: readonly OnnxTensorMetadata[];
	run(feeds: Record<string, unknown>): Promise<Record<string, OnnxTensor>>;
	release(): Promise<void>;
}

/** Load ONNX Runtime only after the user opts into the experimental path. */
export async function createOnnxSession(model: File): Promise<OnnxSession> {
	const ort = await import('onnxruntime-web/wasm');
	ort.env.wasm.wasmPaths = { wasm: wasmUrl };
	ort.env.wasm.numThreads = 1;
	ort.env.wasm.proxy = false;
	ort.env.logLevel = 'warning';
	return (await ort.InferenceSession.create(await model.arrayBuffer(), {
		executionProviders: ['wasm'],
		graphOptimizationLevel: 'all'
	})) as unknown as OnnxSession;
}

export async function releaseOnnxSession(session: OnnxSession): Promise<void> {
	await session.release();
}
