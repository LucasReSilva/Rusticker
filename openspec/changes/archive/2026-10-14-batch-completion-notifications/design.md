# Design: Batch completion notifications

The feature is a standalone Svelte component that observes the existing batch entries and running flag. It does not own or change batch processing. The host route can mount it next to the batch queue and pass the reactive batch state.

The component starts disabled. Its enable button is the only code path that may call `Notification.requestPermission()`. A granted permission enables browser notifications; denied or unsupported states keep the feature usable through a localized in-app notice. A separate disable control stops future browser notifications. The preference is kept in component state for the current page session, so revisiting the app never prompts automatically.

When a running batch transitions to fully settled, emit one generic completion notice with the number of successfully processed images. Do not include source filenames, pixel data, or any other image-derived content. If browser notification delivery is unavailable or disabled, retain the notice in the in-app region until dismissed or another batch starts. All labels and messages come from every locale's message catalog.

No service worker, persistent background task, network request, or server-side behavior is added. Browser tests mock Notification support and permission outcomes; actual OS-level presentation and browser permission UI require manual testing in a real browser.
