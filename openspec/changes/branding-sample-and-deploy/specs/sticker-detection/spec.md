## MODIFIED Requirements

### Requirement: Reference sample verification
The project SHALL provide a verification check that runs detection on the reference sample image with the background color sampled from the image and tolerance 50, and expects the detected stickers in reading order. The reference sample image SHALL be bundled in the repository at `samples/rust-stickers.png` and `web/static/samples/rust-stickers.png` (31 stickers in rows of 8, 8, 7, and 8). When `RUSTICKER_SAMPLE_IMAGE` is provided, the test SHALL use that path (supporting the private reference sample of 17 stickers in rows of 5, 6, and 6); otherwise, it SHALL fall back to the bundled sample image.

#### Scenario: Sample available locally
- **WHEN** a developer sets `RUSTICKER_SAMPLE_IMAGE` to the absolute path of the sample image and runs the test suite
- **THEN** the check passes only if the expected stickers are detected in reading order

#### Scenario: Sample not available
- **WHEN** the test suite runs without `RUSTICKER_SAMPLE_IMAGE`, as in continuous integration
- **THEN** the check runs against the repository bundled sample image and passes with 31 detected stickers

