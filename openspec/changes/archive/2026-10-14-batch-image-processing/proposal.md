# Batch image processing

## Why

Users currently have to replace the active image to process another sticker sheet. This makes a multi-image session cumbersome and risks losing successful results when another image fails.

## What changes

- Accept several image files in one local batch and process them sequentially through the existing detector.
- Track each image as queued, processing, complete, or recoverable error; allow retry, removal, cancellation, and clearing the batch.
- Keep successful sticker results across later failures and combine completed image results for the existing export flow.
- Bound the batch to ten source images and sixty retained stickers. Explain the limits and existing 3–30 sticker pack grouping in the interface.
- Keep image bytes, decoding, detection, and export local to the browser. Processing mode selection remains the scope of issue #46.

## Out of scope

- Automatic or advanced processing modes.
- Parallel detector workers or concurrent image decoding.
- Changing sticker detection or export algorithms.
