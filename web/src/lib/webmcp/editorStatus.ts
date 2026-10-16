import type { EditorWorkflowStatus } from './registry';

export interface EditorWorkflowSnapshot {
	hasImage: boolean;
	isProcessing: boolean;
	isReady: boolean;
	canExport: boolean;
}

/** Reduce private editor state to the only workflow information WebMCP may expose. */
export function mapEditorWorkflowStatus(snapshot: EditorWorkflowSnapshot): EditorWorkflowStatus {
	if (snapshot.isProcessing) return 'image-loaded';
	if (!snapshot.hasImage) return 'empty';
	if (!snapshot.isReady) return 'image-loaded';
	return snapshot.canExport ? 'ready-to-export' : 'reviewing-results';
}
