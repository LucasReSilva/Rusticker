# Batch completion notifications

## Why

Users may leave a multi-image batch running while working elsewhere and need a clear signal when it finishes, without compromising Rusticker's local-only image handling.

## What changes

- Add an explicit control to enable or disable browser notifications for completed image batches.
- Request browser notification permission only in response to the user's enable action.
- Show a localized in-app completion notice whenever browser notifications are unavailable or permission is denied.
- Keep completion notices local and generic; never include image names, image data, or send batch information to a server.
- This change touches `web/` only.

## Out of scope

- Push notifications, service-worker notifications, background processing, or server requests.
- Notifications for individual images while a batch is still running.
