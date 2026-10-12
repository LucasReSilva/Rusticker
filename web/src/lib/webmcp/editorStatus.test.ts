import { describe, expect, it } from 'vitest';
import { mapEditorWorkflowStatus } from './editorStatus';

describe('mapEditorWorkflowStatus', () => {
	it('returns only a coarse state for empty and in-progress editors', () => {
		expect(
			mapEditorWorkflowStatus({
				hasImage: false,
				isProcessing: false,
				isReady: false,
				canExport: false
			})
		).toBe('empty');
		expect(
			mapEditorWorkflowStatus({
				hasImage: true,
				isProcessing: true,
				isReady: false,
				canExport: false
			})
		).toBe('image-loaded');
	});

	it('distinguishes review from export readiness without returning sticker details', () => {
		expect(
			mapEditorWorkflowStatus({
				hasImage: true,
				isProcessing: false,
				isReady: true,
				canExport: false
			})
		).toBe('reviewing-results');
		expect(
			mapEditorWorkflowStatus({
				hasImage: true,
				isProcessing: false,
				isReady: true,
				canExport: true
			})
		).toBe('ready-to-export');
	});

	it('does not report a completed editor as export-ready while processing', () => {
		expect(
			mapEditorWorkflowStatus({
				hasImage: true,
				isProcessing: true,
				isReady: true,
				canExport: true
			})
		).toBe('image-loaded');
	});
});
