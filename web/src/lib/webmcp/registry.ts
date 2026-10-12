export type EditorWorkflowStatus =
	'empty' | 'image-loaded' | 'reviewing-results' | 'ready-to-export';

export interface WebMcpToolMessages {
	openPickerTitle: string;
	openPickerDescription: string;
	statusTitle: string;
	statusDescription: string;
}

export interface WebMcpActions {
	openImagePicker: () => boolean;
	getEditorStatus: () => EditorWorkflowStatus;
}

interface ToolExecutionOptions {
	signal: AbortSignal;
}

export interface ModelContextTool {
	name: string;
	title: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: Record<string, never>;
		additionalProperties: false;
	};
	annotations?: {
		readOnlyHint?: boolean;
	};
	execute: (input: unknown, options: ToolExecutionOptions) => Promise<unknown>;
}

interface ModelContext {
	registerTool: (tool: ModelContextTool, options: { signal: AbortSignal }) => Promise<void>;
}

interface DocumentWithModelContext extends Document {
	modelContext?: ModelContext;
}

const EMPTY_INPUT_SCHEMA: ModelContextTool['inputSchema'] = {
	type: 'object',
	properties: {},
	additionalProperties: false
};

const EDITOR_STATUSES = new Set<EditorWorkflowStatus>([
	'empty',
	'image-loaded',
	'reviewing-results',
	'ready-to-export'
]);

function hasNoInput(input: unknown): boolean {
	return (
		typeof input === 'object' &&
		input !== null &&
		!Array.isArray(input) &&
		Object.keys(input).length === 0
	);
}

function isEditorWorkflowStatus(value: unknown): value is EditorWorkflowStatus {
	return typeof value === 'string' && EDITOR_STATUSES.has(value as EditorWorkflowStatus);
}

/**
 * Registers the two reviewed, data-minimal tools when the experimental API is
 * present. The returned cleanup function is synchronous and safe to call even
 * while registration is still pending.
 */
export function registerRustickerWebMcp(
	host: DocumentWithModelContext | null | undefined,
	actions: WebMcpActions,
	messages: WebMcpToolMessages
): () => void {
	const modelContext = host?.modelContext;
	if (!modelContext || typeof modelContext.registerTool !== 'function') return () => {};

	const controller = new AbortController();
	const registrationOptions = { signal: controller.signal };
	const tools: ModelContextTool[] = [
		{
			name: 'open-image-picker',
			title: messages.openPickerTitle,
			description: messages.openPickerDescription,
			inputSchema: EMPTY_INPUT_SCHEMA,
			async execute(input, { signal }) {
				if (!hasNoInput(input)) throw new Error('Invalid tool input.');
				if (signal.aborted) return { result: 'picker-unavailable' };
				try {
					return { result: actions.openImagePicker() ? 'picker-opened' : 'picker-unavailable' };
				} catch {
					return { result: 'picker-unavailable' };
				}
			}
		},
		{
			name: 'get-editor-status',
			title: messages.statusTitle,
			description: messages.statusDescription,
			inputSchema: EMPTY_INPUT_SCHEMA,
			annotations: { readOnlyHint: true },
			async execute(input, { signal }) {
				if (!hasNoInput(input)) throw new Error('Invalid tool input.');
				try {
					if (signal.aborted) throw new Error();
					const status: unknown = actions.getEditorStatus();
					if (signal.aborted || !isEditorWorkflowStatus(status)) throw new Error();
					return { status };
				} catch {
					throw new Error('Status unavailable.');
				}
			}
		}
	];

	void (async () => {
		try {
			for (const tool of tools) {
				if (controller.signal.aborted) return;
				await modelContext.registerTool(tool, registrationOptions);
			}
		} catch {
			// A WebMCP registration failure must not affect the regular editor UI.
			controller.abort();
		}
	})();

	return () => controller.abort();
}
