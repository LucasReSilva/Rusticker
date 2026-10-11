//! Foreground mask and 3x3 noise opening (design D5).

use image::GrayImage;
use imageproc::distance_transform::Norm;

use crate::color::Thresholds;

/// Foreground value in a mask; background pixels are 0.
pub(crate) const FOREGROUND: u8 = 255;

/// Builds the foreground mask (255 = not background) of a straight RGBA buffer.
///
/// `rgba` must hold exactly `width * height * 4` bytes.
pub(crate) fn foreground_mask(
    rgba: &[u8],
    width: u32,
    height: u32,
    thresholds: &Thresholds,
) -> GrayImage {
    let data = rgba
        .as_chunks::<4>()
        .0
        .iter()
        .map(|p| {
            if thresholds.is_background(p[0], p[1], p[2]) {
                0
            } else {
                FOREGROUND
            }
        })
        .collect();
    GrayImage::from_raw(width, height, data).expect("mask buffer matches dimensions")
}

/// Morphological opening with a 3x3 square: removes every foreground feature
/// that cannot contain a full 3x3 foreground square. Never adds foreground.
pub(crate) fn open_3x3(mask: &GrayImage) -> GrayImage {
    imageproc::morphology::open(mask, Norm::LInf, 1)
}

/// Whether a mask pixel is foreground.
#[cfg(test)]
pub(crate) fn is_foreground(mask: &GrayImage, x: u32, y: u32) -> bool {
    mask.get_pixel(x, y)[0] == FOREGROUND
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::Luma;

    fn mask_with(width: u32, height: u32, rects: &[(u32, u32, u32, u32)]) -> GrayImage {
        let mut mask = GrayImage::new(width, height);
        for &(x, y, w, h) in rects {
            for yy in y..y + h {
                for xx in x..x + w {
                    mask.put_pixel(xx, yy, Luma([FOREGROUND]));
                }
            }
        }
        mask
    }

    #[test]
    fn mask_foreground_from_colors() {
        let rgba = [
            0, 255, 0, 255, 255, 0, 0, 255, 255, 255, 255, 255, 0, 200, 0, 255,
        ];
        let t = Thresholds::new(image::Rgb([0, 255, 0]), 50);
        let mask = foreground_mask(&rgba, 4, 1, &t);
        assert_eq!(mask.as_raw(), &vec![0, 255, 255, 0]);
    }

    #[test]
    fn mask_opening_removes_2x2_speck() {
        let mask = mask_with(20, 20, &[(5, 5, 2, 2)]);
        let opened = open_3x3(&mask);
        assert!(opened.pixels().all(|p| p[0] == 0));
    }

    #[test]
    fn mask_opening_keeps_3x3_block() {
        let mask = mask_with(20, 20, &[(5, 5, 3, 3)]);
        assert_eq!(open_3x3(&mask), mask);
    }

    #[test]
    fn mask_opening_keeps_3px_bridge() {
        // Two 10x10 blocks joined by a 3-pixel-thick horizontal bridge.
        let mask = mask_with(40, 20, &[(2, 5, 10, 10), (12, 8, 10, 3), (22, 5, 10, 10)]);
        let opened = open_3x3(&mask);
        assert_eq!(opened, mask);
        for x in 12..22 {
            assert!(is_foreground(&opened, x, 9));
        }
    }
}
