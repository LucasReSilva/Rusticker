import { describe, expect, it, vi } from 'vitest';
import {
	registerRustickerWebMcp,
	type EditorWorkflowStatus,
	type ModelContextTool,
	type WebMcpToolMessages
} from './registry';

const messages: WebMcpToolMessages = {
	openPickerTitle: 'Choose an image',
	openPickerDescription: 'Open the image picker for the person to choose an image.',
	statusTitle: 'Check editor status',
	statusDescription: 'Return the current coarse workflow state.'
};

type RegisterTool = (tool: ModelContextTool, options: { signal: AbortSignal }) => Promise<void>;

function createRegisterTool(implementation: RegisterTool = async () => {}) {
	return vi.fn(implementation);
}

function createHost(registerTool = createRegisterTool()) {
	return {
		modelContext: { registerTool }
	} as unknown as Document;
}

async function flushRegistration(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

describe('registerRustickerWebMcp', () => {
	it('does nothing when the experimental API is unavailable', async () => {
		const registerTool = createRegisterTool();
		const cleanup = registerRustickerWebMcp(
			{} as Document,
			{
				openImagePicker: vi.fn(() => true),
				getEditorStatus: vi.fn((): EditorWorkflowStatus => 'empty')
			},
			messages
		);

		cleanup();
		await flushRegistration();
		expect(registerTool).not.toHaveBeenCalled();
	});

	it('registers only the picker and coarse read-only status tools with abort cleanup', async () => {
		const registerTool = createRegisterTool();
		const cleanup = registerRustickerWebMcp(
			createHost(registerTool),
			{
				openImagePicker: vi.fn(() => true),
				getEditorStatus: vi.fn((): EditorWorkflowStatus => 'reviewing-results')
			},
			messages
		);
		await flushRegistration();

		expect(registerTool).toHaveBeenCalledTimes(2);
		const first = registerTool.mock.calls[0]![0];
		const second = registerTool.mock.calls[1]![0];
		expect(first.name).toBe('open-image-picker');
		expect(second.name).toBe('get-editor-status');
		expect(second.annotations).toEqual({ readOnlyHint: true });
		expect(first.inputSchema).toEqual({
			type: 'object',
			properties: {},
			additionalProperties: false
		});
		cleanup();
		expect(registerTool.mock.calls[0]![1].signal.aborted).toBe(true);
	});

	it('rejects non-empty or malformed tool input before invoking actions', async () => {
		const openImagePicker = vi.fn(() => true);
		const getEditorStatus = vi.fn((): EditorWorkflowStatus => 'empty');
		const registerTool = createRegisterTool();
		registerRustickerWebMcp(
			createHost(registerTool),
			{ openImagePicker, getEditorStatus },
			messages
		);
		await flushRegistration();

		const picker = registerTool.mock.calls[0]![0];
		const status = registerTool.mock.calls[1]![0];
		await expect(
			picker.execute({ file: 'private.png' }, { signal: new AbortController().signal })
		).rejects.toThrow('Invalid tool input.');
		await expect(
			status.execute({ detail: true }, { signal: new AbortController().signal })
		).rejects.toThrow('Invalid tool input.');
		expect(openImagePicker).not.toHaveBeenCalled();
		expect(getEditorStatus).not.toHaveBeenCalled();
	});

	it('returns bounded results and forwards picker failure without image data', async () => {
		const openImagePicker = vi.fn(() => false);
		const getEditorStatus = vi.fn<() => EditorWorkflowStatus>(() => 'ready-to-export');
		const registerTool = createRegisterTool();
		registerRustickerWebMcp(
			createHost(registerTool),
			{ openImagePicker, getEditorStatus },
			messages
		);
		await flushRegistration();

		const picker = registerTool.mock.calls[0]![0];
		const status = registerTool.mock.calls[1]![0];
		const signal = new AbortController().signal;
		const pickerResult = await picker.execute({}, { signal });
		const statusResult = await status.execute({}, { signal });
		expect(pickerResult).toEqual({ result: 'picker-unavailable' });
		expect(statusResult).toEqual({ status: 'ready-to-export' });
		expect(Object.keys(pickerResult as object)).toEqual(['result']);
		expect(Object.keys(statusResult as object)).toEqual(['status']);
	});

	it('does not expose invalid states and aborts a pending registration on cleanup', async () => {
		let completeRegistration: (() => void) | undefined;
		const registerTool = createRegisterTool(
			async () => new Promise<void>((resolve) => (completeRegistration = resolve))
		);
		const cleanup = registerRustickerWebMcp(
			createHost(registerTool),
			{
				openImagePicker: vi.fn(() => true),
				getEditorStatus: vi.fn(() => 'private-value' as EditorWorkflowStatus)
			},
			messages
		);
		await flushRegistration();
		const signal = registerTool.mock.calls[0]![1].signal;
		cleanup();
		expect(signal.aborted).toBe(true);
		completeRegistration?.();
		await flushRegistration();
		expect(registerTool).toHaveBeenCalledTimes(1);
	});

	it('masks callback failures behind fixed generic results', async () => {
		const registerTool = createRegisterTool();
		registerRustickerWebMcp(
			createHost(registerTool),
			{
				openImagePicker: () => {
					throw new Error('private file metadata');
				},
				getEditorStatus: () => {
					throw new Error('private editor details');
				}
			},
			messages
		);
		await flushRegistration();

		const signal = new AbortController().signal;
		const picker = registerTool.mock.calls[0]![0];
		const status = registerTool.mock.calls[1]![0];
		expect(await picker.execute({}, { signal })).toEqual({ result: 'picker-unavailable' });
		await expect(status.execute({}, { signal })).rejects.toThrow('Status unavailable.');
	});

	it('does not invoke the picker after execution is cancelled', async () => {
		const registerTool = createRegisterTool();
		const openImagePicker = vi.fn(() => true);
		registerRustickerWebMcp(
			createHost(registerTool),
			{
				openImagePicker,
				getEditorStatus: vi.fn((): EditorWorkflowStatus => 'empty')
			},
			messages
		);
		await flushRegistration();

		const controller = new AbortController();
		controller.abort();
		const picker = registerTool.mock.calls[0]![0];
		expect(await picker.execute({}, { signal: controller.signal })).toEqual({
			result: 'picker-unavailable'
		});
		expect(openImagePicker).not.toHaveBeenCalled();
	});

	it('aborts all registrations when the API rejects a registration', async () => {
		const registerTool = createRegisterTool(async () => {
			throw new Error('unsupported API shape');
		});
		const cleanup = registerRustickerWebMcp(
			createHost(registerTool),
			{
				openImagePicker: vi.fn(() => true),
				getEditorStatus: vi.fn((): EditorWorkflowStatus => 'empty')
			},
			messages
		);
		await flushRegistration();
		expect(registerTool).toHaveBeenCalledTimes(1);
		expect(registerTool.mock.calls[0]![1].signal.aborted).toBe(true);
		cleanup();
	});
});
