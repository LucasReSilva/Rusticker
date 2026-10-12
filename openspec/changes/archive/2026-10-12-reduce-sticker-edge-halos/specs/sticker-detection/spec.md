## ADDED Requirements

### Requirement: Sticker edge color decontamination
For a foreground source pixel at a sticker boundary, the detector SHALL reduce selected-background color spill only when it has reliable evidence that the opaque source RGB is a mixture of the selected background color and a nearby opaque interior color from the same sticker. This correction SHALL affect RGB only; it SHALL preserve the detector's existing alpha coverage, component membership, bounding boxes, and reading order. The detector SHALL preserve source RGB for partially transparent pixels and for boundary pixels without reliable evidence of background spill. Fully transparent output pixels SHALL remain `(0, 0, 0, 0)`.

#### Scenario: Opaque boundary color contains selected-background spill
- **WHEN** an opaque sticker boundary pixel is a measurable mixture of the selected background color and a nearby opaque interior color from the same sticker
- **THEN** the output boundary RGB is closer to the interior color than the uncorrected output, while its output alpha remains unchanged

#### Scenario: Opaque interior color is preserved
- **WHEN** a foreground pixel has a full foreground neighborhood and is not a boundary pixel
- **THEN** its output RGB and alpha are unchanged

#### Scenario: Partially transparent source RGB is preserved
- **WHEN** a foreground boundary pixel has nonzero source alpha below 255 and its input RGB is straight foreground color
- **THEN** the detector preserves that RGB and applies only the existing geometric alpha coverage

#### Scenario: Ambiguous edge color is preserved
- **WHEN** a boundary pixel has no reliable nearby interior reference or its RGB does not provide reliable evidence of selected-background mixing
- **THEN** the detector leaves its source RGB unchanged

#### Scenario: Multicolored interior has no representative reference
- **WHEN** nearby opaque interior anchors are multicolored without a unanimous representative color
- **THEN** the detector leaves an ambiguous boundary pixel's source RGB unchanged

#### Scenario: Selected background is not green
- **WHEN** an opaque boundary pixel contains spill from a selected uniform background color other than green and the same mixing evidence is present
- **THEN** the detector reduces that selected-background spill without changing output alpha

#### Scenario: Transparent-background source is unchanged
- **WHEN** a sticker source has transparent surroundings and its boundary pixels contain no selected-background spill
- **THEN** the detector preserves the boundary RGB and existing alpha coverage
