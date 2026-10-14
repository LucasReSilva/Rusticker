## ADDED Requirements

### Requirement: Batch processing progress is understandable
The editor SHALL show the number of batch images whose processing has ended out of the total, using actual image states rather than an estimated per-image percentage. It SHALL distinguish successful results from items needing attention, and SHALL expose the progress in every supported locale to sighted users and assistive technology users. The progress presentation SHALL not block retry, cancellation, or editing, and SHALL disappear when the batch is cleared.

#### Scenario: Batch starts
- **WHEN** images are added to an empty batch
- **THEN** the progress presentation shows the total image count and zero completed images until processing actually ends for an item

#### Scenario: Batch advances
- **WHEN** an image finishes processing
- **THEN** the completed count and progress indicator advance to match the number of images whose processing has ended

#### Scenario: Batch needs attention
- **WHEN** processing fails or is cancelled for an image
- **THEN** that image counts as handled, while the presentation does not describe it as a successful result

#### Scenario: Batch is cleared
- **WHEN** the user clears the batch
- **THEN** the progress presentation disappears

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** all batch states remain readable without non-essential animation
