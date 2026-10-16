# batch-completion-notifications Specification

## Purpose
Provides optional, privacy-preserving notifications and in-app feedback when a batch of images finishes processing, without leaking image metadata or requiring network communication.

## Requirements

### Requirement: Explicit notification opt-in
The application SHALL request browser notification permission only after the user explicitly activates the notification control. The user SHALL be able to disable browser notifications.

#### Scenario: Enable notifications
- **WHEN** the user activates the enable control
- **THEN** the application requests permission if required and enables browser notifications only when permission is granted

#### Scenario: Disable notifications
- **WHEN** the user activates the disable control
- **THEN** future batch completions use the in-app notice instead of browser notifications

#### Scenario: Permission is denied or notifications are unsupported
- **WHEN** permission is denied or the browser does not support notifications
- **THEN** the application SHALL keep batch completion feedback available inside the application without requesting permission again automatically

### Requirement: Local batch completion feedback
The application SHALL report a completed batch using either a browser notification or an in-app notice. Completion feedback SHALL contain no image names or image data, SHALL be generated only on the user's device, and SHALL NOT use push or server communication.

#### Scenario: Batch completes with permission granted and notifications enabled
- **WHEN** all queued batch processing settles and at least one image completed successfully
- **THEN** one generic browser notification reports the number of completed images

#### Scenario: Batch completes without browser notification delivery
- **WHEN** a batch completes while notifications are disabled, denied, or unsupported
- **THEN** one localized in-app notice reports the number of completed images

#### Scenario: Batch has no successful images
- **WHEN** all batch processing settles and no image completed successfully
- **THEN** no success completion notification is emitted

### Requirement: Localized notification controls
The tool page SHALL expose notification controls beside batch processing. Notification controls and fallback feedback SHALL be available in every supported locale and SHALL remain usable with keyboard and assistive technology.

#### Scenario: Use controls in each supported locale
- **WHEN** the user opens the notification controls in any supported locale
- **THEN** every control label and completion message is translated in that locale and can be operated by keyboard
