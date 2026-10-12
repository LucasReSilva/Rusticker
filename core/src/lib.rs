//! Rusticker core: detects stickers laid out on a uniform-color background and
//! returns each one as a background-free 512x512 RGBA image, in reading order.
//!
//! The pipeline (see the `sticker-detection` spec):
//!
//! 1. classify every pixel as background or foreground in HSV, from the picked
//!    background color and a 0-100 tolerance;
//! 2. remove noise with a 3x3 morphological opening;
//! 3. label 8-connected foreground regions and drop those below 0.4% of the image;
//! 4. crop each region with source alpha multiplied by 3x3 component coverage,
//!    then conservatively decontaminate eligible opaque boundary colors;
//! 5. sort into rows, then left to right;
//! 6. fit each crop to 480 px and center it in a transparent 512x512 frame.
//!
//! Failures are [`ErrorCode`]s only; the core never produces user-facing text,
//! and it performs no I/O.

mod alpha;
mod color;
mod components;
mod error;
mod frame;
mod mask;
mod order;
mod split;
mod wasm;

use image::{Rgb, RgbaImage};

pub use error::ErrorCode;
pub use frame::{CONTENT_SIZE, FRAME_SIZE};
pub use wasm::{Detection, detect};

/// Proposes reviewed sub-stickers from a 512x512 sticker returned by detection.
/// An empty result means the bounded candidate operation found no split.
pub fn propose_sticker_split(image: &RgbaImage) -> Vec<Sticker> {
    split::propose(image)
}

/// Longest accepted side, in pixels.
pub const MAX_SIDE: u32 = 8192;
/// Largest accepted pixel count.
pub const MAX_PIXELS: u64 = 40_000_000;
/// Largest accepted tolerance.
pub const MAX_TOLERANCE: u8 = 100;

/// A sticker's bounding box in source-image pixels.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct BBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// One detected sticker.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Sticker {
    /// Where the sticker was found in the source image.
    pub bbox: BBox,
    /// The framed sticker: 512x512, straight RGBA, transparent background.
    pub image: RgbaImage,
}

/// Detects stickers in `image` on the given background color.
///
/// `tolerance` ranges from 0 to 100 (the app's default is 50).
///
/// # Errors
///
/// [`ErrorCode::InvalidInput`] for a zero dimension or a tolerance above 100,
/// [`ErrorCode::ImageTooLarge`] above the size limits, and
/// [`ErrorCode::NoStickers`] when nothing survives detection.
pub fn detect_stickers(
    image: &RgbaImage,
    background: Rgb<u8>,
    tolerance: u8,
) -> Result<Vec<Sticker>, ErrorCode> {
    let (width, height) = image.dimensions();
    validate(width, height, None, 0, tolerance)?;
    run(image.as_raw(), width, height, background, tolerance)
}

/// Detects stickers in a straight RGBA buffer of `width * height * 4` bytes.
///
/// `background` is a `0xRRGGBB` color and `tolerance` ranges from 0 to 100.
///
/// # Errors
///
/// Checks run in this order, and the first failing one decides the code:
/// a zero dimension is [`ErrorCode::InvalidInput`]; a side above 8192 or more
/// than 40,000,000 pixels is [`ErrorCode::ImageTooLarge`]; a buffer of the
/// wrong length, a tolerance above 100, or a background above `0xFFFFFF` is
/// [`ErrorCode::InvalidInput`]. [`ErrorCode::NoStickers`] is returned when
/// nothing survives detection.
pub fn detect_rgba(
    rgba: &[u8],
    width: u32,
    height: u32,
    background: u32,
    tolerance: u8,
) -> Result<Vec<Sticker>, ErrorCode> {
    validate(width, height, Some(rgba.len()), background, tolerance)?;
    let [_, r, g, b] = background.to_be_bytes();
    run(rgba, width, height, Rgb([r, g, b]), tolerance)
}

/// Input validation in the order the spec requires. `buffer_len` is `None`
/// when the buffer is known to be consistent with the dimensions.
fn validate(
    width: u32,
    height: u32,
    buffer_len: Option<usize>,
    background: u32,
    tolerance: u8,
) -> Result<(), ErrorCode> {
    if width == 0 || height == 0 {
        return Err(ErrorCode::InvalidInput);
    }
    let pixels = u64::from(width) * u64::from(height);
    if width > MAX_SIDE || height > MAX_SIDE || pixels > MAX_PIXELS {
        return Err(ErrorCode::ImageTooLarge);
    }
    if let Some(len) = buffer_len
        && u64::try_from(len).ok() != Some(pixels * 4)
    {
        return Err(ErrorCode::InvalidInput);
    }
    if tolerance > MAX_TOLERANCE || background > 0x00FF_FFFF {
        return Err(ErrorCode::InvalidInput);
    }
    Ok(())
}

/// The shared pipeline. `rgba` has already been validated.
fn run(
    rgba: &[u8],
    width: u32,
    height: u32,
    background: Rgb<u8>,
    tolerance: u8,
) -> Result<Vec<Sticker>, ErrorCode> {
    let thresholds = color::Thresholds::new(background, tolerance);
    let opened = {
        let raw = mask::foreground_mask(rgba, width, height, &thresholds);
        mask::open_3x3(&raw)
    };
    let (labels, components) = components::find_components(&opened)?;
    drop(opened);

    let boxes: Vec<BBox> = components
        .iter()
        .map(|c| BBox {
            x: c.min_x,
            y: c.min_y,
            width: c.width(),
            height: c.height(),
        })
        .collect();
    let crops: Vec<RgbaImage> = components
        .iter()
        .map(|c| alpha::extract(rgba, width, &labels, c, background))
        .collect();
    drop(labels);

    let mut crops: Vec<Option<RgbaImage>> = crops.into_iter().map(Some).collect();
    Ok(order::reading_order(&boxes)
        .into_iter()
        .map(|i| {
            let crop = crops[i].take().expect("each index appears once");
            Sticker {
                bbox: boxes[i],
                image: frame::frame(&crop),
            }
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_zero_dimension() {
        assert_eq!(
            validate(0, 100, Some(0), 0, 50),
            Err(ErrorCode::InvalidInput)
        );
        assert_eq!(
            validate(100, 0, Some(0), 0, 50),
            Err(ErrorCode::InvalidInput)
        );
    }

    #[test]
    fn validate_buffer_length() {
        assert_eq!(
            validate(10, 10, Some(399), 0, 50),
            Err(ErrorCode::InvalidInput)
        );
        assert_eq!(
            validate(10, 10, Some(401), 0, 50),
            Err(ErrorCode::InvalidInput)
        );
        assert_eq!(validate(10, 10, Some(400), 0, 50), Ok(()));
    }

    #[test]
    fn validate_side_limit() {
        assert_eq!(
            validate(8193, 1, Some(8193 * 4), 0, 50),
            Err(ErrorCode::ImageTooLarge)
        );
        assert_eq!(
            validate(1, 8193, Some(8193 * 4), 0, 50),
            Err(ErrorCode::ImageTooLarge)
        );
        assert_eq!(validate(8192, 1, Some(8192 * 4), 0, 50), Ok(()));
    }

    #[test]
    fn validate_pixel_limit() {
        assert_eq!(
            validate(8000, 5001, Some(3), 0, 50),
            Err(ErrorCode::ImageTooLarge)
        );
        assert_eq!(validate(8000, 5000, Some(8000 * 5000 * 4), 0, 50), Ok(()));
        assert_eq!(validate(8000, 5000, None, 0, 50), Ok(()));
    }

    #[test]
    fn validate_tolerance_and_background() {
        assert_eq!(
            validate(10, 10, Some(400), 0, 101),
            Err(ErrorCode::InvalidInput)
        );
        assert_eq!(validate(10, 10, Some(400), 0, 100), Ok(()));
        assert_eq!(
            validate(10, 10, Some(400), 0x0100_0000, 50),
            Err(ErrorCode::InvalidInput)
        );
        assert_eq!(validate(10, 10, Some(400), 0x00FF_FFFF, 50), Ok(()));
    }

    #[test]
    fn validate_order_size_before_length() {
        assert_eq!(
            validate(8193, 1, Some(0), 0x0100_0000, 255),
            Err(ErrorCode::ImageTooLarge)
        );
        assert_eq!(
            validate(10, 10, Some(0), 0x0100_0000, 255),
            Err(ErrorCode::InvalidInput)
        );
    }
}
