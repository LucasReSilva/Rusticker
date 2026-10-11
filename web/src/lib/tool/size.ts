export type StickerSizeInfo =
	| { status: 'pending' }
	| { status: 'ready'; bytes: number; overLimit: boolean }
	| { status: 'error' };
