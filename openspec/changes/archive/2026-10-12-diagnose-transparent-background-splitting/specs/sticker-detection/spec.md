## MODIFIED Requirements

### Requirement: Background classification
The core SHALL classify each pixel as background or foreground using the caller-provided 24-bit RGB background color and tolerance. A pixel whose source alpha is zero SHALL always be background, regardless of its stored RGB values. At tolerance 0, a non-transparent pixel SHALL be background if and only if its RGB value exactly equals the selected background color. At tolerance `t` greater than 0, with the background color's saturation `s_bg` and value `v_bg`, a non-transparent pixel SHALL be background if and only if all of the following hold in hue-saturation-value color space, where hue is in degrees from 0 to 360 and saturation and value are fractions from 0 to 1:
- the circular hue distance between the pixel and the background color is at most `t` degrees;
- the pixel's saturation is at least `min(0.94 * (1 - t / 100), s_bg)`;
- the pixel's value is at least `min(0.48 * (1 - t / 100), v_bg)`.

An achromatic pixel (saturation 0) SHALL have hue 0 for nonzero tolerances. The background color itself SHALL always be background, and raising a nonzero tolerance SHALL NOT turn a background pixel into foreground. A uniform background of any RGB color is supported when the caller supplies that exact color with tolerance 0; at higher tolerances, foreground colors that satisfy the background thresholds may also be removed.

#### Scenario: Default tolerance on pure green reproduces the prototype
- **WHEN** the background color is `0x00FF00` and the tolerance is 50
- **THEN** an opaque pixel is background exactly when its hue is between 70° and 170° inclusive, its saturation is at least 47%, and its value is at least 24%

#### Scenario: White outline is foreground
- **WHEN** the background color is `0x00FF00`, the tolerance is 50, and a pixel is pure white with nonzero alpha
- **THEN** that pixel is foreground

#### Scenario: Picked color is background at any tolerance
- **WHEN** a non-transparent pixel has exactly the selected background RGB value
- **THEN** that pixel is background at every tolerance from 0 to 100

#### Scenario: Zero tolerance distinguishes a neutral background from colored stickers
- **WHEN** the background is uniform gray, the tolerance is 0, and a sticker pixel is red
- **THEN** the gray pixel is background and the red pixel is foreground

#### Scenario: Transparent hidden RGB does not affect classification
- **WHEN** a pixel has alpha 0 and any stored RGB value
- **THEN** it is background

#### Scenario: Higher tolerance removes more background
- **WHEN** the same image is classified with tolerance 30 and with tolerance 70
- **THEN** every non-transparent pixel that is background at tolerance 30 is also background at tolerance 70

### Requirement: Background removal and transparency
Within a sticker's bounding box, a pixel SHALL be opaque only if it belongs to that sticker's region and is not background. Every other pixel, including background enclosed by the sticker (interior gaps), pixels of a different sticker that fall inside the bounding box, and source pixels whose alpha is zero, SHALL be transparent. For a source pixel with nonzero alpha that belongs to a sticker, the detector's 3x3 neighborhood coverage SHALL soften the edge without increasing that source pixel's opacity; the resulting alpha SHALL be the source alpha multiplied by the neighborhood coverage, rounded to the nearest integer. Pixels whose whole 3x3 neighborhood belongs to the sticker SHALL retain their source alpha. Output colors SHALL be straight (non-premultiplied) RGBA, and every fully transparent output pixel SHALL be `(0, 0, 0, 0)` so that no background color is carried in transparent pixels.

#### Scenario: Interior gap is transparent
- **WHEN** a sticker is a 480x480 square outline with 40-pixel-thick walls enclosing a background-colored 400x400 hole
- **THEN** the output pixels inside the hole, more than 1 pixel away from the walls, have alpha 0

#### Scenario: Neighbor inside the bounding box is excluded
- **WHEN** an L-shaped sticker's bounding box also contains part of another, non-touching sticker
- **THEN** the other sticker's pixels are transparent in the first sticker's output

#### Scenario: Soft edge preserves source opacity
- **WHEN** a sticker is a solid 480x240 rectangle with source alpha 128 and its content is not rescaled
- **THEN** interior pixels have alpha 128 and boundary pixels have alpha greater than 0 and less than 128

#### Scenario: Soft edge
- **WHEN** a sticker is a solid 480x240 rectangle with source alpha 255, so its content is not rescaled
- **THEN** output pixels more than 1 pixel inside the rectangle are fully opaque, and pixels on its outer boundary have alpha strictly between 0 and 255

#### Scenario: Fully transparent source pixels stay transparent
- **WHEN** a fully transparent pixel lies inside a sticker's detected bounding box
- **THEN** its output alpha is 0 regardless of the pixel's stored RGB value

#### Scenario: Transparent pixels carry no color
- **WHEN** any sticker is returned
- **THEN** every pixel with alpha 0 has red, green, blue, and alpha equal to 0
