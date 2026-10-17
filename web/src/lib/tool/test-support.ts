import { vi } from 'vitest';
import type { Sticker } from '$lib/detection';

/** DOM facilities used by Bits UI and static sticker canvases in component tests. */
export function installDomMocks(): void {
	vi.stubGlobal(
		'PointerEvent',
		class extends MouseEvent {
			pointerId: number;
			pointerType: string;
			constructor(type: string, init: PointerEventInit = {}) {
				super(type, init);
				this.pointerId = init.pointerId ?? 0;
				this.pointerType = init.pointerType ?? 'mouse';
			}
		}
	);
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
	vi.stubGlobal(
		'ImageData',
		class {
			constructor(
				public data: Uint8ClampedArray,
				public width: number,
				public height: number
			) {}
		}
	);
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		putImageData: vi.fn()
	} as unknown as CanvasRenderingContext2D);
}

export function image(width = 4, height = 4, rgb = [10, 20, 30]): ImageData {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let offset = 0; offset < data.length; offset += 4) data.set([...rgb, 255], offset);
	return { width, height, data } as ImageData;
}

export function stickers(count = 4): Sticker[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `test-s${index}`,
		index,
		bbox: { x: index * 2, y: 1, width: 2, height: 3 },
		pixels: image()
	}));
}
