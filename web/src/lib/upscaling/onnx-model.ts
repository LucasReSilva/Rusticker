import type { OnnxSession, OnnxTensor, OnnxTensorMetadata } from './onnx-runtime';
import type { ImageDimensions } from './image';
import { scaledDimensions } from './image';

export const ONNX_TILE_SIZE = 64;
export const ONNX_TILE_STRIDE = 48;
export const ONNX_SCALE = 4;
const CROP = (ONNX_TILE_SIZE - ONNX_TILE_STRIDE) / 2;

export class OnnxModelFailure extends Error {
	constructor(readonly code: 'ModelInvalid' | 'InferenceFailed' | 'MemoryLimit') {
		super(code);
	}
}

function isDynamic(value: number | string): boolean {
	return typeof value === 'string' || value === -1;
}

function isNchwRgb(metadata: OnnxTensorMetadata, dynamicSpatial: boolean): boolean {
	const [batch, channels, height, width] = metadata.dimensions;
	return (
		metadata.type === 'float32' &&
		metadata.dimensions.length === 4 &&
		batch === 1 &&
		channels === 3 &&
		(dynamicSpatial ? isDynamic(height) && isDynamic(width) : true)
	);
}

export function validateOnnxContract(session: OnnxSession): void {
	if (
		session.inputNames.length !== 1 ||
		session.outputNames.length !== 1 ||
		session.inputMetadata.length !== 1 ||
		session.outputMetadata.length !== 1 ||
		!isNchwRgb(session.inputMetadata[0], true) ||
		!isNchwRgb(session.outputMetadata[0], true)
	)
		throw new OnnxModelFailure('ModelInvalid');
	const inputShape = session.inputMetadata[0].dimensions;
	const outputShape = session.outputMetadata[0].dimensions;
	if (inputShape[0] !== outputShape[0] || inputShape[1] !== outputShape[1])
		throw new OnnxModelFailure('ModelInvalid');
}

export function tileStarts(length: number): number[] {
	if (!Number.isSafeInteger(length) || length <= 0) throw new RangeError('InvalidDimensions');
	const starts: number[] = [];
	for (let start = 0; start < length; start += ONNX_TILE_STRIDE) starts.push(start);
	return starts;
}

export type TileRegion = {
	start: number;
	cropStart: number;
	cropEnd: number;
	outputStart: number;
	length: number;
};

export function tileRegions(length: number): TileRegion[] {
	const starts = tileStarts(length);
	return starts.map((start, index) => {
		const first = index === 0;
		const last = index === starts.length - 1;
		const cropStart = first ? 0 : CROP;
		const cropEnd = last ? 0 : CROP;
		const outputStart = start + cropStart;
		return {
			start,
			cropStart,
			cropEnd,
			outputStart,
			length: Math.min(length, start + ONNX_TILE_SIZE - cropEnd) - outputStart
		};
	});
}

export function extractRgbTile(
	pixels: Uint8ClampedArray,
	width: number,
	height: number,
	startX: number,
	startY: number
): Float32Array {
	const tile = new Float32Array(3 * ONNX_TILE_SIZE * ONNX_TILE_SIZE);
	const plane = ONNX_TILE_SIZE * ONNX_TILE_SIZE;
	for (let y = 0; y < ONNX_TILE_SIZE; y++) {
		const sourceY = Math.min(startY + y, height - 1);
		for (let x = 0; x < ONNX_TILE_SIZE; x++) {
			const sourceX = Math.min(startX + x, width - 1);
			const source = (sourceY * width + sourceX) * 4;
			const target = y * ONNX_TILE_SIZE + x;
			tile[target] = pixels[source] / 255;
			tile[plane + target] = pixels[source + 1] / 255;
			tile[2 * plane + target] = pixels[source + 2] / 255;
		}
	}
	return tile;
}

export function validateTileOutput(tensor: OnnxTensor): Float32Array {
	const outputSize = ONNX_TILE_SIZE * ONNX_SCALE;
	if (
		tensor.dims.length !== 4 ||
		tensor.dims[0] !== 1 ||
		tensor.dims[1] !== 3 ||
		tensor.dims[2] !== outputSize ||
		tensor.dims[3] !== outputSize ||
		tensor.data.length !== 3 * outputSize * outputSize
	)
		throw new OnnxModelFailure('InferenceFailed');
	const values = Float32Array.from(tensor.data);
	if (!values.every(Number.isFinite)) throw new OnnxModelFailure('InferenceFailed');
	return values;
}

export async function upscaleRgbWithSession(
	session: OnnxSession,
	pixels: Uint8ClampedArray,
	dimensions: ImageDimensions,
	onTile: (completed: number, total: number) => void
): Promise<Uint8ClampedArray> {
	validateOnnxContract(session);
	const { width, height } = dimensions;
	let outputDimensions: ImageDimensions;
	try {
		outputDimensions = scaledDimensions(dimensions, ONNX_SCALE);
	} catch {
		throw new OnnxModelFailure('MemoryLimit');
	}
	const xs = tileStarts(width);
	const ys = tileStarts(height);
	const xRegions = tileRegions(width);
	const yRegions = tileRegions(height);
	const outWidth = outputDimensions.width;
	const outHeight = outputDimensions.height;
	const output = new Uint8ClampedArray(outWidth * outHeight * 4);
	const outPlane = outWidth * ONNX_TILE_SIZE * ONNX_SCALE;
	const tileOutputSize = ONNX_TILE_SIZE * ONNX_SCALE;
	const total = xs.length * ys.length;
	let completed = 0;
	const inputShape = session.inputMetadata[0].dimensions;
	const outputShape = session.outputMetadata[0].dimensions;

	for (const [yIndex, startY] of ys.entries()) {
		for (const [xIndex, startX] of xs.entries()) {
			const input = extractRgbTile(pixels, width, height, startX, startY);
			const batch = inputShape[0];
			const channels = inputShape[1];
			const inputHeight = inputShape[2];
			const inputWidth = inputShape[3];
			if (
				(inputHeight !== 'height' && inputHeight !== -1 && inputHeight !== ONNX_TILE_SIZE) ||
				(inputWidth !== 'width' && inputWidth !== -1 && inputWidth !== ONNX_TILE_SIZE)
			)
				throw new OnnxModelFailure('ModelInvalid');
			const tensor = await session.run({
				[session.inputNames[0]]: {
					data: input,
					dims: [Number(batch), Number(channels), ONNX_TILE_SIZE, ONNX_TILE_SIZE],
					type: 'float32'
				}
			});
			const modelOutput = tensor[session.outputNames[0]];
			if (
				(typeof outputShape[2] === 'number' &&
					outputShape[2] !== -1 &&
					outputShape[2] !== ONNX_TILE_SIZE * ONNX_SCALE) ||
				(typeof outputShape[3] === 'number' &&
					outputShape[3] !== -1 &&
					outputShape[3] !== ONNX_TILE_SIZE * ONNX_SCALE)
			)
				throw new OnnxModelFailure('ModelInvalid');
			const data = validateTileOutput(modelOutput);
			const xRegion = xRegions[xIndex];
			const yRegion = yRegions[yIndex];
			const cropX = xRegion.cropStart * ONNX_SCALE;
			const cropY = yRegion.cropStart * ONNX_SCALE;
			const copyWidth = Math.min(xRegion.length, width - xRegion.outputStart) * ONNX_SCALE;
			const copyHeight = Math.min(yRegion.length, height - yRegion.outputStart) * ONNX_SCALE;
			for (let y = 0; y < copyHeight; y++) {
				const destination =
					((yRegion.outputStart * ONNX_SCALE + y) * outWidth + xRegion.outputStart * ONNX_SCALE) *
					4;
				for (let x = 0; x < copyWidth; x++) {
					const source = (cropY + y) * tileOutputSize + cropX + x;
					const dest = destination + x * 4;
					output[dest] = Math.round(Math.min(1, Math.max(0, data[source] ?? 0)) * 255);
					output[dest + 1] = Math.round(
						Math.min(1, Math.max(0, data[outPlane + source] ?? 0)) * 255
					);
					output[dest + 2] = Math.round(
						Math.min(1, Math.max(0, data[2 * outPlane + source] ?? 0)) * 255
					);
					output[dest + 3] = 255;
				}
			}
			onTile(++completed, total);
		}
	}
	return output;
}
