import { expect, expectTypeOf, it } from 'vitest';
import type { StickerSizeInfo } from './types';
import type { StickerSizeInfo as ContractSizeInfo } from '$lib/tool/size';

it('preserves the R6 size contract in both directions', () => {
	expectTypeOf<StickerSizeInfo>().toExtend<ContractSizeInfo>();
	expectTypeOf<ContractSizeInfo>().toExtend<StickerSizeInfo>();
	expectTypeOf<StickerSizeInfo>().toEqualTypeOf<ContractSizeInfo>();
	expect(true).toBe(true);
});
