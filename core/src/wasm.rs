//! WebAssembly bindings (design D2): a thin wrapper over [`crate::detect_rgba`].
//!
//! Compiled on every target so it is linted and unit-tested natively; only the
//! outermost layer converts [`ErrorCode`]s into thrown JavaScript strings.

use wasm_bindgen::prelude::*;

use crate::{ErrorCode, Sticker, detect_rgba};

/// Detects stickers in a straight RGBA buffer.
///
/// Throws the code name (`"NoStickers"`, `"ImageTooLarge"`, `"InvalidInput"`)
/// as a string on failure. Intended for JavaScript; Rust callers should use
/// [`crate::detect_rgba`], since building a `JsValue` only works on wasm32.
#[wasm_bindgen]
pub fn detect(
    rgba: &[u8],
    width: u32,
    height: u32,
    background: u32,
    tolerance: u8,
) -> Result<Detection, JsValue> {
    detect_rgba(rgba, width, height, background, tolerance)
        .map(Detection::new)
        .map_err(to_js)
}

/// The stickers found by [`detect`], in reading order.
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Detection {
    stickers: Vec<Sticker>,
}

#[wasm_bindgen]
impl Detection {
    /// Number of stickers.
    #[wasm_bindgen(getter)]
    pub fn count(&self) -> u32 {
        self.stickers.len() as u32
    }

    /// Bounding box of sticker `index` in source pixels: `[x, y, width, height]`.
    /// Throws `"InvalidInput"` when `index >= count`.
    pub fn bbox(&self, index: u32) -> Result<Vec<u32>, JsValue> {
        self.bbox_inner(index).map_err(to_js)
    }

    /// The 512x512 straight RGBA image of sticker `index` (1,048,576 bytes).
    /// Throws `"InvalidInput"` when `index >= count`.
    pub fn rgba(&self, index: u32) -> Result<Vec<u8>, JsValue> {
        self.rgba_inner(index).map_err(to_js)
    }
}

impl Detection {
    fn new(stickers: Vec<Sticker>) -> Self {
        Self { stickers }
    }

    fn get(&self, index: u32) -> Result<&Sticker, ErrorCode> {
        usize::try_from(index)
            .ok()
            .and_then(|i| self.stickers.get(i))
            .ok_or(ErrorCode::InvalidInput)
    }

    fn bbox_inner(&self, index: u32) -> Result<Vec<u32>, ErrorCode> {
        let b = self.get(index)?.bbox;
        Ok(vec![b.x, b.y, b.width, b.height])
    }

    fn rgba_inner(&self, index: u32) -> Result<Vec<u8>, ErrorCode> {
        Ok(self.get(index)?.image.as_raw().clone())
    }
}

fn to_js(code: ErrorCode) -> JsValue {
    JsValue::from_str(code.as_str())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::BBox;
    use image::RgbaImage;

    fn detection(n: u32) -> Detection {
        Detection::new(
            (0..n)
                .map(|i| Sticker {
                    bbox: BBox {
                        x: i,
                        y: 2 * i,
                        width: 10,
                        height: 20,
                    },
                    image: RgbaImage::new(512, 512),
                })
                .collect(),
        )
    }

    #[test]
    fn wasm_detection_accessors() {
        let d = detection(3);
        assert_eq!(d.count(), 3);
        assert_eq!(d.bbox_inner(2), Ok(vec![2, 4, 10, 20]));
        assert_eq!(d.rgba_inner(0).map(|v| v.len()), Ok(1_048_576));
    }

    #[test]
    fn wasm_detection_out_of_range_index() {
        let d = detection(3);
        assert_eq!(d.bbox_inner(3), Err(ErrorCode::InvalidInput));
        assert_eq!(d.rgba_inner(3), Err(ErrorCode::InvalidInput));
        assert_eq!(d.rgba_inner(u32::MAX), Err(ErrorCode::InvalidInput));
    }
}
