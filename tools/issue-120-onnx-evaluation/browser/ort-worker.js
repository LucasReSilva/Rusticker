import * as ort from './ort.wasm.min.mjs';
import {
  createFixtures,
  compositeMetrics,
  downsampleArea,
  fixtureContract,
  imageMetrics,
  referenceChannels,
  resizeLanczos,
  seamMetrics,
} from './fixtures.js';

function clampOutput(data) {
  return Float32Array.from(data, (value) => Math.min(1, Math.max(0, value)));
}

async function infer(session, pixels, size) {
  const input = new ort.Tensor('float32', pixels, [1, 3, size, size]);
  const result = await session.run({ [session.inputNames[0]]: input });
  const output = result[session.outputNames[0]];
  if (output.dims.join(',') !== `1,3,${4 * size},${4 * size}`) {
    throw new Error(`Unexpected output dimensions: ${output.dims.join(',')}`);
  }
  if (!output.data.every(Number.isFinite)) throw new Error('Model returned a non-finite output value');
  return clampOutput(output.data);
}

function extractTile(source, x, y, tileSize = 40, fullSize = 64) {
  const planeSize = fullSize * fullSize;
  const tilePlaneSize = tileSize * tileSize;
  const output = new Float32Array(3 * tilePlaneSize);
  for (let channel = 0; channel < 3; channel += 1) {
    for (let row = 0; row < tileSize; row += 1) {
      const from = channel * planeSize + (y + row) * fullSize + x;
      const to = channel * tilePlaneSize + row * tileSize;
      output.set(source.subarray(from, from + tileSize), to);
    }
  }
  return output;
}

async function inferTiled(session, pixels) {
  const output = new Float32Array(3 * 256 * 256);
  const positions = [0, 24];
  for (const tileY of positions) {
    for (const tileX of positions) {
      const tile = await infer(session, extractTile(pixels, tileX, tileY), 40);
      const targetX = tileX === 0 ? 0 : 128;
      const targetY = tileY === 0 ? 0 : 128;
      const sourceX = tileX === 0 ? 0 : 32;
      const sourceY = tileY === 0 ? 0 : 32;
      for (let channel = 0; channel < 3; channel += 1) {
        for (let y = 0; y < 128; y += 1) {
          const from = channel * 160 * 160 + (sourceY + y) * 160 + sourceX;
          const to = channel * 256 * 256 + (targetY + y) * 256 + targetX;
          output.set(tile.subarray(from, from + 128), to);
        }
      }
    }
  }
  return output;
}

function scalarMetrics(actual, reference) {
  let squaredError = 0;
  let absoluteError = 0;
  for (let i = 0; i < actual.length; i += 1) {
    const difference = actual[i] - reference[i];
    squaredError += difference * difference;
    absoluteError += Math.abs(difference);
  }
  const mse = squaredError / actual.length;
  return {
    psnrDb: mse === 0 ? null : +(10 * Math.log10(1 / mse)).toFixed(3),
    exact: mse === 0,
    meanAbsoluteError: +(absoluteError / actual.length).toFixed(6),
  };
}

async function evaluateFixtures(session) {
  const results = [];
  const tiled = {};
  for (const fixture of createFixtures()) {
    const lowResolution = downsampleArea(fixture.rgba);
    const reference = referenceChannels(fixture.rgba);
    const baseline = resizeLanczos(lowResolution.rgb, 3);
    const baselineAlpha = resizeLanczos(lowResolution.alpha, 1);
    const candidate = await infer(session, lowResolution.rgb, 64);
    const result = {
      name: fixture.name,
      baseline: imageMetrics(baseline, reference.rgb, reference.alpha),
      candidate: imageMetrics(candidate, reference.rgb, reference.alpha),
      baselineAlpha: scalarMetrics(baselineAlpha, reference.alpha),
      alphaMethod: 'Lanczos-3 resize of source alpha; model is RGB-only.',
    };
    if (fixture.name === 'alpha-edge') {
      result.alphaEdge = {
        baseline: result.baselineAlpha,
        candidate: scalarMetrics(baselineAlpha, reference.alpha),
        baselineComposite: [
          compositeMetrics(baseline, baselineAlpha, reference.rgb, reference.alpha, 0),
          compositeMetrics(baseline, baselineAlpha, reference.rgb, reference.alpha, 1),
        ],
        candidateComposite: [
          compositeMetrics(candidate, baselineAlpha, reference.rgb, reference.alpha, 0),
          compositeMetrics(candidate, baselineAlpha, reference.rgb, reference.alpha, 1),
        ],
        hiddenTransparentRgbMean: imageMetrics(candidate, reference.rgb, reference.alpha).transparentRgbMean,
        transparentBackgroundRgbIsExcludedFromComposite: true,
        alphaReconstruction: 'Lanczos-3 resize of source alpha; model is RGB-only.',
      };
    }
    if (fixture.name === 'line-art' || fixture.name === 'alpha-edge') {
      const tiledOutput = await inferTiled(session, lowResolution.rgb);
      tiled[fixture.name] = seamMetrics(candidate, tiledOutput);
    }
    results.push(result);
    self.postMessage({ status: 'progress', fixture: fixture.name, completed: results.length, total: 5 });
  }
  return { contract: fixtureContract, results, tiledSeams: tiled };
}

self.onmessage = async ({ data: { size } }) => {
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

    if (new URL(self.location.href).searchParams.get('mode') === 'fixtures') {
      const fixtureResults = await evaluateFixtures(session);
      self.postMessage({
        status: 'completed',
        runtime: 'onnxruntime-web',
        version: ort.env.versions.web,
        provider: 'wasm',
        modelBytes: model.byteLength,
        loadAndInitializeMs: +(readyAt - loadedAt).toFixed(1),
        ...fixtureResults,
        userAgent: navigator.userAgent,
      });
      await session.release();
      return;
    }

    const pixels = new Float32Array(3 * size * size);
    for (let channel = 0; channel < 3; channel += 1) {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const base = x < size / 2 ? 0.15 : 0.75;
          pixels[(channel * size + y) * size + x] = Math.abs(x - y) < 2 ? 1 : base;
        }
      }
    }

    const inputName = session.inputNames[0];
    const input = new ort.Tensor('float32', pixels, [1, 3, size, size]);
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
      status: finite && output.dims.join(',') === `1,3,${4 * size},${4 * size}` ? 'passed' : 'failed',
      inputShape: [1, 3, size, size],
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
