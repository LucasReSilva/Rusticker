# Proposal: Erase and restore sticker pixels with a brush

## Why

Auto-detection and thresholding occasionally leave stray background pixels or inadvertently erase fine details of a sticker (e.g. hair strands, antenna tips). Users need a pixel-level eraser and restoration brush in the browser to refine cut-outs directly without external photo editing software.

## What

Add an interactive pixel brush tool to the sticker editor that:
1. Allows users to switch between **Erase** (sets alpha to 0) and **Restore** (restores original source pixels from the cropped bounds).
2. Supports brush size adjustment and zooming for detailed precision.
3. Provides local undo/redo/reset capabilities for brush strokes.
4. Updates the sticker image, checkerboard preview, and exported sticker pack deterministically.
5. Operates purely on the client with zero network data transfer.
