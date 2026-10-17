import * as ort from './ort.wasm.min.mjs';

self.onmessage = async () => {
  try {
    const startedAt = performance.now();
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = '/';
    const response = await fetch('/model.onnx');
    if (!response.ok) throw new Error(`Model fetch failed: ${response.status}`);
    const model = new Uint8Array(await response.arrayBuffer());
    const loadedAt = performance.now();
    const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
    const readyAt = performance.now();

    const pixels = new Float32Array(3 * 64 * 64);
    for (let channel = 0; channel < 3; channel += 1) {
      for (let y = 0; y < 64; y += 1) {
        for (let x = 0; x < 64; x += 1) {
          const base = x < 32 ? 0.15 : 0.75;
          pixels[(channel * 64 + y) * 64 + x] = Math.abs(x - y) < 2 ? 1 : base;
        }
      }
    }

    const inputName = session.inputNames[0];
    const input = new ort.Tensor('float32', pixels, [1, 3, 64, 64]);
    const firstStartedAt = performance.now();
    const first = await session.run({ [inputName]: input });
    const firstFinishedAt = performance.now();
    const second = await session.run({ [inputName]: input });
    const secondFinishedAt = performance.now();
    const output = second[session.outputNames[0]];
    let min = Infinity;
    let max = -Infinity;
    let finite = true;
    for (const value of output.data) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      finite &&= Number.isFinite(value);
    }

    self.postMessage({
      status: finite && output.dims.join(',') === '1,3,256,256' ? 'passed' : 'failed',
      runtime: 'onnxruntime-web',
      version: ort.env.versions.web,
      provider: 'wasm',
      modelBytes: model.byteLength,
      wasmBytes: 14_239_897,
      loaderBytes: 50_126,
      runtimeBytesTotal: 14_290_023,
      modelFetchMs: +(loadedAt - startedAt).toFixed(1),
      loadAndInitializeMs: +(readyAt - loadedAt).toFixed(1),
      firstInferenceMs: +(firstFinishedAt - firstStartedAt).toFixed(1),
      secondInferenceMs: +(secondFinishedAt - firstFinishedAt).toFixed(1),
      totalMs: +(secondFinishedAt - startedAt).toFixed(1),
      outputShape: output.dims,
      outputFinite: finite,
      outputRange: [min, max],
      firstOutputLength: first[session.outputNames[0]].data.length,
      userAgent: navigator.userAgent,
    });
    await session.release();
  } catch (error) {
    self.postMessage({ status: 'error', message: String(error), stack: error.stack });
  }
};
