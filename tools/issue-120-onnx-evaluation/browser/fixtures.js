const OUTPUT_SIZE = 256;
const INPUT_SIZE = 64;
const SCALE = OUTPUT_SIZE / INPUT_SIZE;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function hashNoise(x, y, seed) {
  let value = Math.imul(x + seed, 0x45d9f3b) ^ Math.imul(y - seed, 0x119de1f3);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function sourcePixel(name, x, y) {
  const nx = x / (OUTPUT_SIZE - 1);
  const ny = y / (OUTPUT_SIZE - 1);
  if (name === 'illustration') {
    const circle = (nx - 0.5) ** 2 + (ny - 0.48) ** 2 < 0.16;
    const stripe = Math.abs(ny - (0.2 + nx * 0.55)) < 0.018;
    const color = circle ? [0.92, 0.36, 0.12] : stripe ? [0.1, 0.56, 0.28] : [0.96, 0.9, 0.72];
    return [...color, 1];
  }
  if (name === 'text') {
    const glyphs = [
      ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
      ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
      ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    ];
    const cell = 12;
    const ox = 32;
    const oy = 80;
    let ink = false;
    for (let g = 0; g < glyphs.length; g += 1) {
      const gx = Math.floor((x - ox - g * 6 * cell) / cell);
      const gy = Math.floor((y - oy) / cell);
      if (gx >= 0 && gx < 5 && gy >= 0 && gy < 7 && glyphs[g][gy][gx] === '1') ink = true;
    }
    return ink ? [0.08, 0.12, 0.18, 1] : [0.97, 0.96, 0.91, 1];
  }
  if (name === 'line-art') {
    const diagonal = Math.abs(y - (22 + x * 0.72)) < 1.35;
    const crossing = Math.abs(y - (210 - x * 0.61)) < 1.35;
    const ring = Math.abs(Math.hypot(x - 128, y - 128) - 74) < 1.35;
    return diagonal || crossing || ring ? [0.04, 0.07, 0.11, 1] : [0.98, 0.98, 0.96, 1];
  }
  if (name === 'alpha-edge') {
    const distance = Math.hypot(x - 128, y - 128);
    const alpha = clamp(132 - distance);
    // Deliberately retain colored RGB under transparent pixels to expose halos.
    return alpha > 0 ? [0.94, 0.22, 0.14, alpha] : [0.08, 0.78, 0.16, 0];
  }
  const noise = hashNoise(x, y, 17) / 0xffffffff;
  const broad = Math.sin(nx * 14) * Math.cos(ny * 11) * 0.12;
  return [
    clamp(0.34 + broad + noise * 0.28),
    clamp(0.42 - broad * 0.6 + noise * 0.22),
    clamp(0.48 + broad * 0.3 + noise * 0.18),
    1,
  ];
}

export function createFixtures() {
  return ['illustration', 'text', 'line-art', 'alpha-edge', 'photo-texture'].map((name) => {
    const rgba = new Float32Array(OUTPUT_SIZE * OUTPUT_SIZE * 4);
    for (let y = 0; y < OUTPUT_SIZE; y += 1) {
      for (let x = 0; x < OUTPUT_SIZE; x += 1) {
        const offset = (y * OUTPUT_SIZE + x) * 4;
        rgba.set(sourcePixel(name, x, y), offset);
      }
    }
    return { name, rgba };
  });
}

export function downsampleArea(rgba) {
  const rgb = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const alpha = new Float32Array(INPUT_SIZE * INPUT_SIZE);
  for (let y = 0; y < INPUT_SIZE; y += 1) {
    for (let x = 0; x < INPUT_SIZE; x += 1) {
      let a = 0;
      const channels = [0, 0, 0];
      for (let dy = 0; dy < SCALE; dy += 1) {
        for (let dx = 0; dx < SCALE; dx += 1) {
          const offset = ((y * SCALE + dy) * OUTPUT_SIZE + x * SCALE + dx) * 4;
          const sampleAlpha = rgba[offset + 3];
          a += sampleAlpha;
          for (let c = 0; c < 3; c += 1) channels[c] += rgba[offset + c] * sampleAlpha;
        }
      }
      const index = y * INPUT_SIZE + x;
      alpha[index] = a / (SCALE * SCALE);
      for (let c = 0; c < 3; c += 1) {
        rgb[c * INPUT_SIZE * INPUT_SIZE + index] = a > 0 ? channels[c] / a : 0;
      }
    }
  }
  return { rgb, alpha };
}

function sinc(value) {
  if (Math.abs(value) < 1e-8) return 1;
  const angle = Math.PI * value;
  return Math.sin(angle) / angle;
}

function lanczos(value, radius = 3) {
  return Math.abs(value) >= radius ? 0 : sinc(value) * sinc(value / radius);
}

export function resizeLanczos(source, channels, sourceSize = INPUT_SIZE, targetSize = OUTPUT_SIZE) {
  const temporary = new Float32Array(channels * targetSize * sourceSize);
  const output = new Float32Array(channels * targetSize * targetSize);
  const scale = sourceSize / targetSize;
  const support = Math.max(3, 3 / scale);
  for (let channel = 0; channel < channels; channel += 1) {
    for (let y = 0; y < sourceSize; y += 1) {
      for (let x = 0; x < targetSize; x += 1) {
        const center = (x + 0.5) * scale - 0.5;
        const start = Math.max(0, Math.floor(center - support + 1));
        const end = Math.min(sourceSize - 1, Math.ceil(center + support - 1));
        let sum = 0;
        let weightSum = 0;
        for (let ix = start; ix <= end; ix += 1) {
          const weight = lanczos((center - ix) * Math.min(1, scale));
          sum += source[channel * sourceSize * sourceSize + y * sourceSize + ix] * weight;
          weightSum += weight;
        }
        temporary[channel * targetSize * sourceSize + y * targetSize + x] = weightSum ? sum / weightSum : 0;
      }
    }
    for (let y = 0; y < targetSize; y += 1) {
      const center = (y + 0.5) * scale - 0.5;
      const start = Math.max(0, Math.floor(center - support + 1));
      const end = Math.min(sourceSize - 1, Math.ceil(center + support - 1));
      for (let x = 0; x < targetSize; x += 1) {
        let sum = 0;
        let weightSum = 0;
        for (let iy = start; iy <= end; iy += 1) {
          const weight = lanczos((center - iy) * Math.min(1, scale));
          sum += temporary[channel * targetSize * sourceSize + iy * targetSize + x] * weight;
          weightSum += weight;
        }
        output[channel * targetSize * targetSize + y * targetSize + x] = clamp(weightSum ? sum / weightSum : 0);
      }
    }
  }
  return output;
}

export function referenceChannels(rgba) {
  const rgb = new Float32Array(3 * OUTPUT_SIZE * OUTPUT_SIZE);
  const alpha = new Float32Array(OUTPUT_SIZE * OUTPUT_SIZE);
  for (let index = 0; index < OUTPUT_SIZE * OUTPUT_SIZE; index += 1) {
    for (let channel = 0; channel < 3; channel += 1) rgb[channel * OUTPUT_SIZE * OUTPUT_SIZE + index] = rgba[index * 4 + channel];
    alpha[index] = rgba[index * 4 + 3];
  }
  return { rgb, alpha };
}

export function imageMetrics(actual, reference, alpha = null) {
  let squaredError = 0;
  let absoluteError = 0;
  let actualSum = 0;
  let referenceSum = 0;
  let actualSquaredSum = 0;
  let referenceSquaredSum = 0;
  let productSum = 0;
  let count = 0;
  let bleed = 0;
  let bleedCount = 0;
  for (let pixel = 0; pixel < OUTPUT_SIZE * OUTPUT_SIZE; pixel += 1) {
    const a = alpha?.[pixel] ?? 1;
    if (alpha && a < 0.01) {
      bleed += (actual[pixel] + actual[OUTPUT_SIZE * OUTPUT_SIZE + pixel] + actual[2 * OUTPUT_SIZE * OUTPUT_SIZE + pixel]) / 3;
      bleedCount += 1;
      continue;
    }
    for (let channel = 0; channel < 3; channel += 1) {
      const index = channel * OUTPUT_SIZE * OUTPUT_SIZE + pixel;
      const difference = actual[index] - reference[index];
      squaredError += difference * difference;
      absoluteError += Math.abs(difference);
      actualSum += actual[index];
      referenceSum += reference[index];
      actualSquaredSum += actual[index] * actual[index];
      referenceSquaredSum += reference[index] * reference[index];
      productSum += actual[index] * reference[index];
      count += 1;
    }
  }
  const mse = squaredError / Math.max(1, count);
  const meanActual = actualSum / Math.max(1, count);
  const meanReference = referenceSum / Math.max(1, count);
  const varianceActual = actualSquaredSum / Math.max(1, count) - meanActual ** 2;
  const varianceReference = referenceSquaredSum / Math.max(1, count) - meanReference ** 2;
  const covariance = productSum / Math.max(1, count) - meanActual * meanReference;
  const c1 = 0.01 ** 2;
  const c2 = 0.03 ** 2;
  const ssim = ((2 * meanActual * meanReference + c1) * (2 * covariance + c2))
    / ((meanActual ** 2 + meanReference ** 2 + c1) * (varianceActual + varianceReference + c2));
  return {
    psnrDb: mse === 0 ? Infinity : +(10 * Math.log10(1 / mse)).toFixed(3),
    globalSsim: +ssim.toFixed(6),
    meanAbsoluteError: +(absoluteError / Math.max(1, count)).toFixed(6),
    transparentRgbMean: alpha ? +(bleed / Math.max(1, bleedCount)).toFixed(6) : null,
    transparentPixels: bleedCount,
  };
}

export function compositeMetrics(actual, actualAlpha, reference, referenceAlpha, background) {
  let squaredError = 0;
  let absoluteError = 0;
  let count = 0;
  for (let pixel = 0; pixel < OUTPUT_SIZE * OUTPUT_SIZE; pixel += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      const index = channel * OUTPUT_SIZE * OUTPUT_SIZE + pixel;
      const actualComposite = actual[index] * actualAlpha[pixel] + background * (1 - actualAlpha[pixel]);
      const referenceComposite = reference[index] * referenceAlpha[pixel] + background * (1 - referenceAlpha[pixel]);
      const difference = actualComposite - referenceComposite;
      squaredError += difference * difference;
      absoluteError += Math.abs(difference);
      count += 1;
    }
  }
  const mse = squaredError / count;
  return {
    psnrDb: mse === 0 ? Infinity : +(10 * Math.log10(1 / mse)).toFixed(3),
    meanAbsoluteError: +(absoluteError / count).toFixed(6),
    background: background === 0 ? 'black' : 'white',
  };
}

export function seamMetrics(full, tiled) {
  let maxAbsoluteError = 0;
  let meanAbsoluteError = 0;
  let count = 0;
  const edge = 2;
  for (let channel = 0; channel < 3; channel += 1) {
    for (let y = 0; y < OUTPUT_SIZE; y += 1) {
      for (let x = 0; x < OUTPUT_SIZE; x += 1) {
        const onInternalSeam = (x >= 128 - edge && x < 128 + edge) || (y >= 128 - edge && y < 128 + edge);
        if (!onInternalSeam) continue;
        const index = channel * OUTPUT_SIZE * OUTPUT_SIZE + y * OUTPUT_SIZE + x;
        const error = Math.abs(full[index] - tiled[index]);
        maxAbsoluteError = Math.max(maxAbsoluteError, error);
        meanAbsoluteError += error;
        count += 1;
      }
    }
  }
  return { seamBandPixels: count, meanAbsoluteError: +(meanAbsoluteError / count).toFixed(6), maxAbsoluteError: +maxAbsoluteError.toFixed(6) };
}

export const fixtureContract = {
  inputSize: INPUT_SIZE,
  outputSize: OUTPUT_SIZE,
  degradation: 'Exact 4x4 box-area average of deterministic 256x256 generated references.',
  baseline: 'Separable Lanczos-3 resize from 64x64 to 256x256, channel-wise, clamped to [0,1].',
  alpha: 'Model receives RGB only; alpha is independently resized with Lanczos-3. Transparent RGB and alpha-edge metrics are reported separately.',
  tile: '2x2 40x40 input tiles with 16px overlap; discard 8px from internal edges and compare retained tile pixels to whole-image inference.',
};
