## Purpose

Detects every sticker in a single image laid out on a uniform-color background and returns each sticker as an ordered, background-free 512x512 image together with its position in the source image, or a language-neutral failure code. This is the processing core that the browser app calls; it never produces user-facing text.

## ADDED Requirements

### Requirement: Detection input
The detection core SHALL accept a straight (non-premultiplied) RGBA pixel buffer of `width * height * 4` bytes in row-major order, the image `width` and `height` in pixels, a background color given as a 24-bit `0xRRGGBB` value, and a tolerance integer from 0 to 100 inclusive. The browser app's default tolerance is 50. The core SHALL NOT have a built-in default background color; the caller always provides it.

#### Scenario: Valid input is processed
- **WHEN** the core receives a 300x200 image as a 240,000-byte RGBA buffer, the background color `0x00FF00`, and tolerance 50
- **THEN** it runs detection and returns either a list of stickers or the `NoStickers` failure code, and no other failure code

### Requirement: Input validation and size limits
The core SHALL reject invalid input with the failure code `InvalidInput` and oversized input with the failure code `ImageTooLarge`, without panicking or partially processing the image. The checks SHALL be applied in this order, and the first failing check determines the code:
1. `width` or `height` is 0: `InvalidInput`.
2. `width` > 8192, `height` > 8192, or `width * height` > 40,000,000: `ImageTooLarge`.
3. The buffer length is not exactly `width * height * 4`: `InvalidInput`.
4. The tolerance is greater than 100, or the background value is greater than `0xFFFFFF`: `InvalidInput`.

#### Scenario: Zero dimension
- **WHEN** the core receives width 0 and height 100
- **THEN** it fails with `InvalidInput`

#### Scenario: Buffer length mismatch
- **WHEN** the core receives width 10, height 10, and a buffer of 399 bytes
- **THEN** it fails with `InvalidInput`

#### Scenario: Side too long
- **WHEN** the core receives width 8193 and height 1
- **THEN** it fails with `ImageTooLarge`

#### Scenario: Too many pixels
- **WHEN** the core receives width 8000 and height 5001 (40,005,000 pixels)
- **THEN** it fails with `ImageTooLarge`, even if the buffer length is wrong

#### Scenario: Largest accepted image
- **WHEN** the core receives width 8000 and height 5000 with a correctly sized buffer
- **THEN** it does not fail with `ImageTooLarge` or `InvalidInput`

#### Scenario: Tolerance out of range
- **WHEN** the core receives a valid image and tolerance 101
- **THEN** it fails with `InvalidInput`

### Requirement: Failures are codes, never text
Every failure SHALL be reported as exactly one of the codes `NoStickers`, `ImageTooLarge`, or `InvalidInput`. When called from the browser, the failure SHALL surface as a thrown string equal to the code name. The core SHALL NOT return or throw human-readable messages.

#### Scenario: Failure crosses into the browser
- **WHEN** the browser calls detection with a buffer whose length does not match the dimensions
- **THEN** the call throws the string `InvalidInput`

### Requirement: Background classification
The core SHALL classify each pixel as background or foreground by comparing it with the background color in the hue-saturation-value color space, where hue is in degrees from 0 to 360 and saturation and value are fractions from 0 to 1. An achromatic pixel (saturation 0) SHALL have hue 0. With tolerance `t` and the background color's saturation `s_bg` and value `v_bg`, a pixel SHALL be background if and only if all of the following hold:
- the circular hue distance between the pixel and the background color is at most `t` degrees;
- the pixel's saturation is at least `min(0.94 * (1 - t / 100), s_bg)`;
- the pixel's value is at least `min(0.48 * (1 - t / 100), v_bg)`.

Consequences the core SHALL preserve: the background color itself is always background, and raising the tolerance never turns a background pixel into foreground.

#### Scenario: Default tolerance on pure green reproduces the prototype
- **WHEN** the background color is `0x00FF00` and the tolerance is 50
- **THEN** a pixel is background exactly when its hue is between 70° and 170° inclusive, its saturation is at least 47%, and its value is at least 24%

#### Scenario: White outline is foreground
- **WHEN** the background color is `0x00FF00`, the tolerance is 50, and a pixel is pure white
- **THEN** that pixel is foreground

#### Scenario: Picked color is background at any tolerance
- **WHEN** the tolerance is 0 and a pixel has exactly the background color
- **THEN** that pixel is background

#### Scenario: Higher tolerance removes more background
- **WHEN** the same image is classified with tolerance 30 and with tolerance 70
- **THEN** every pixel that is background at tolerance 30 is also background at tolerance 70

### Requirement: Noise removal and minimum sticker size
The core SHALL remove foreground noise by discarding foreground features that cannot contain a full 3x3 square of foreground pixels (a 3x3 morphological opening), and SHALL then discard every remaining connected foreground region whose pixel count is less than 0.4% of the image's pixel count.

#### Scenario: JPEG speck is ignored
- **WHEN** an image on a uniform background contains three large stickers and an isolated 2x2 block of foreground pixels
- **THEN** exactly three stickers are returned

#### Scenario: Small region is discarded
- **WHEN** a 1000x1000 image contains one 100x100 sticker and one solid 60x60 foreground region (3,600 pixels, 0.36% of the image)
- **THEN** exactly one sticker is returned

#### Scenario: Region at the threshold is kept
- **WHEN** a 1000x1000 image contains a solid 80x50 foreground region (4,000 pixels, exactly 0.4% of the image)
- **THEN** that region is returned as a sticker

### Requirement: Sticker separation
Each sticker SHALL be one region of foreground pixels connected through any of their 8 neighbors (horizontal, vertical, or diagonal). Foreground regions that touch, even only diagonally, SHALL be returned as a single sticker.

#### Scenario: Separate stickers
- **WHEN** an image contains three non-touching rectangles of different colors on the background
- **THEN** exactly three stickers are returned

#### Scenario: Touching stickers merge
- **WHEN** two rectangles share an edge or are joined by a foreground bridge at least 3 pixels thick
- **THEN** they are returned as one sticker

### Requirement: No stickers found
The core SHALL fail with `NoStickers` when no foreground region survives noise removal and the minimum size filter.

#### Scenario: Background-only image
- **WHEN** every pixel of the image has the background color
- **THEN** detection fails with `NoStickers`

#### Scenario: Only noise
- **WHEN** the image contains only foreground regions smaller than 0.4% of the image
- **THEN** detection fails with `NoStickers`

### Requirement: Sticker bounding box
Each returned sticker SHALL report its bounding box in source-image pixels as `[x, y, width, height]`, where `(x, y)` is the top-left foreground pixel corner and the box is the smallest axis-aligned rectangle containing every pixel of the sticker's region.

#### Scenario: Rectangle sticker
- **WHEN** a sticker is a solid rectangle covering columns 10 to 59 and rows 20 to 49
- **THEN** its bounding box is `[10, 20, 50, 30]`

### Requirement: Background removal and transparency
Within a sticker's bounding box, a pixel SHALL be opaque only if it belongs to that sticker's region and is not background. Every other pixel, including background enclosed by the sticker (interior gaps) and pixels of a different sticker that fall inside the bounding box, SHALL be transparent. The alpha edge SHALL be softened with a 3x3 average so that boundary pixels get intermediate alpha, while pixels whose whole 3x3 neighborhood belongs to the sticker stay fully opaque. Output colors SHALL be straight (non-premultiplied) RGBA, and every fully transparent output pixel SHALL be `(0, 0, 0, 0)` so that no background color is carried in transparent pixels.

#### Scenario: Interior gap is transparent
- **WHEN** a sticker is a 480x480 square outline with 40-pixel-thick walls enclosing a background-colored 400x400 hole
- **THEN** the output pixels inside the hole, more than 1 pixel away from the walls, have alpha 0

#### Scenario: Neighbor inside the bounding box is excluded
- **WHEN** an L-shaped sticker's bounding box also contains part of another, non-touching sticker
- **THEN** the other sticker's pixels are transparent in the first sticker's output

#### Scenario: Soft edge
- **WHEN** a sticker is a solid 480x240 rectangle, so its content is not rescaled
- **THEN** output pixels more than 1 pixel inside the rectangle are fully opaque, and pixels on its outer boundary have alpha strictly between 0 and 255

#### Scenario: Transparent pixels carry no color
- **WHEN** any sticker is returned
- **THEN** every output pixel with alpha 0 has red, green, and blue equal to 0

### Requirement: Output framing
Each returned sticker image SHALL be exactly 512x512 pixels. The sticker's bounding-box content SHALL be scaled, up or down, preserving its aspect ratio, so that its longer side is 480 pixels (the shorter side rounded to the nearest pixel, minimum 1), using a high-quality resampling filter that does not bleed background color into edges. The scaled content SHALL be centered in the frame (offset rounded down), and everything outside it SHALL be fully transparent.

#### Scenario: Wide sticker
- **WHEN** a sticker's bounding box is 200x100 pixels
- **THEN** its output is 512x512 with the visible content inside a 480x240 area starting at column 16 and row 136

#### Scenario: Tall sticker
- **WHEN** a sticker's bounding box is 50x100 pixels
- **THEN** its output content is upscaled into a 240x480 area starting at column 136 and row 16

#### Scenario: Margins are transparent
- **WHEN** any sticker is returned
- **THEN** every pixel in the outer 16-pixel border of the 512x512 frame has alpha 0

### Requirement: Reading order
The core SHALL return stickers in reading order: grouped into rows from top to bottom, and left to right within each row. Rows SHALL be formed as follows, using each sticker's bounding box and exact (non-rounded) arithmetic with `top = y`, `bottom = y + height`, `center_y = y + height / 2`, and `center_x = x + width / 2`:
1. Sort all stickers by `center_y` ascending (ties by `center_x`).
2. Walk the sorted list; the first sticker opens a row. Each following sticker joins the current row if its `center_y` is strictly less than the largest `bottom` among the stickers already in that row; otherwise it opens a new row.
3. Within each row, order stickers by `center_x` ascending (ties by `top`).

This rule SHALL keep a short sticker in the same row as taller neighbors whose vertical extent covers its center, even when the short sticker's center is far from theirs.

#### Scenario: Three stickers in one row
- **WHEN** a green image contains three non-touching rectangles side by side at the same height, red on the left, blue in the middle, and yellow on the right
- **THEN** exactly three stickers are returned in the order red, blue, yellow

#### Scenario: Two rows with mixed heights
- **WHEN** the top row holds a tall sticker spanning rows 10-109 on the right and a short sticker spanning rows 80-99 on the left, and a second row holds two stickers spanning rows 150-199
- **THEN** the order is short top-left, tall top-right, then the second row from left to right

#### Scenario: Row break
- **WHEN** a sticker's vertical center is at or below the bottom edge of every sticker already in the current row
- **THEN** it starts a new row and is returned after all stickers of the previous row

### Requirement: Deterministic results
Given the same input buffer, dimensions, background color, and tolerance, the core SHALL return the same number of stickers, in the same order, with byte-identical bounding boxes and images.

#### Scenario: Repeated call
- **WHEN** detection runs twice on the same input
- **THEN** both results are identical

### Requirement: Browser interface
The core SHALL be usable from the browser as a WebAssembly module named `rusticker-core` that exports an initialization function and a `detect(rgba, width, height, background, tolerance)` function. On success, `detect` SHALL return a result object exposing a read-only `count` of stickers, `bbox(index)` returning the 4-element `[x, y, width, height]` as unsigned 32-bit integers, `rgba(index)` returning the 512x512x4-byte image, and `free()` to release its memory. Indices SHALL follow the reading order. Calling `bbox` or `rgba` with an index not less than `count` SHALL throw `InvalidInput`.

#### Scenario: Successful browser call
- **WHEN** the browser calls `detect` on an image with three stickers
- **THEN** `count` is 3, `bbox(0)` has 4 elements, and `rgba(0)` has 1,048,576 bytes

#### Scenario: Out-of-range index
- **WHEN** the browser calls `rgba(3)` on a result whose `count` is 3
- **THEN** the call throws `InvalidInput`

### Requirement: Processing stays local
The core SHALL perform detection purely on the in-memory buffer it receives, with no file, network, or other external access, so that images never leave the user's device.

#### Scenario: Offline detection
- **WHEN** detection runs with no network available
- **THEN** it produces the same result as when the network is available

### Requirement: Reference sample verification
The project SHALL provide a local-only check that runs detection on the private reference sample image (2752x1536, green background, 17 stickers in rows of 5, 6, and 6) with the background color sampled from the image and tolerance 50, and expects 17 stickers in reading order. The sample image SHALL NOT be stored in the repository; the check SHALL locate it through the `RUSTICKER_SAMPLE_IMAGE` environment variable and SHALL be skipped, not failed, when the variable is unset.

#### Scenario: Sample available locally
- **WHEN** a developer sets `RUSTICKER_SAMPLE_IMAGE` to the absolute path of the sample image and runs the test suite
- **THEN** the check passes only if 17 stickers are detected, forming rows of 5, 6, and 6 in reading order

#### Scenario: Sample not available
- **WHEN** the test suite runs without `RUSTICKER_SAMPLE_IMAGE`, as in continuous integration
- **THEN** the check is reported as skipped and the suite still passes
