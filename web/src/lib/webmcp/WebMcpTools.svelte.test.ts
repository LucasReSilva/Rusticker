import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WebMcpTools from './WebMcpTools.svelte';
import type { ModelContextTool, WebMcpActions } from './registry';

let originalModelContext: PropertyDescriptor | undefined;

afterEach(() => {
	cleanup();
	if (originalModelContext) {
		Object.defineProperty(document, 'modelContext', originalModelContext);
	} else {
		Reflect.deleteProperty(document, 'modelContext');
	}
	originalModelContext = undefined;
});

describe('WebMcpTools', () => {
	it('registers localized tools on mount and aborts them on unmount', async () => {
		originalModelContext = Object.getOwnPropertyDescriptor(document, 'modelContext');
		const registerTool = vi.fn(async (tool: ModelContextTool, options: { signal: AbortSignal }) => {
			void tool;
			void options;
		});
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: { registerTool }
		});
		const actions: WebMcpActions = {
			openImagePicker: () => false,
			getEditorStatus: () => 'empty'
		};
		const view = render(WebMcpTools, { actions });

		await waitFor(() => expect(registerTool).toHaveBeenCalledTimes(2));
		expect(registerTool.mock.calls.map(([tool]) => tool.name)).toEqual([
			'open-image-picker',
			'get-editor-status'
		]);
		expect(registerTool.mock.calls.every(([tool]) => tool.title.length > 0)).toBe(true);

		view.unmount();
		expect(registerTool.mock.calls[0]![1].signal.aborted).toBe(true);
	});
});
