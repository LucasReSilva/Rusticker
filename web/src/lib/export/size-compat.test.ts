import { expect, expectTypeOf, it } from 'vitest';
import type { StickerSizeInfo } from './types';

type ContractSizeInfo =
	| { status: 'pending' }
	| { status: 'ready'; bytes: number; overLimit: boolean }
	| { status: 'error' };

it('preserves the R6 size contract in both directions', () => {
	expectTypeOf<StickerSizeInfo>().toExtend<ContractSizeInfo>();
	expectTypeOf<ContractSizeInfo>().toExtend<StickerSizeInfo>();
	expectTypeOf<StickerSizeInfo>().toEqualTypeOf<ContractSizeInfo>();
	expect(true).toBe(true);
});
