//! Fitting a sticker crop into a transparent 512x512 frame (design D7).

use image::imageops::{self, FilterType};
use image::{Rgba, Rgba32FImage, RgbaImage};

/// Side of the output frame, in pixels.
pub const FRAME_SIZE: u32 = 512;
/// Longest side of the sticker content inside the frame, in pixels.
pub const CONTENT_SIZE: u32 = 480;

/// Size of the content once its long side is scaled to [`CONTENT_SIZE`]:
/// the short side is rounded to the nearest pixel, minimum 1.
pub(crate) fn fitted_size(width: u32, height: u32) -> (u32, u32) {
    let scale_short = |short: u32, long: u32| -> u32 {
        let num = u64::from(short) * u64::from(CONTENT_SIZE);
        let long = u64::from(long);
        (((2 * num + long) / (2 * long)) as u32).max(1)
    };
    if width >= height {
        (CONTENT_SIZE, scale_short(height, width))
    } else {
        (scale_short(width, height), CONTENT_SIZE)
    }
}

/// Scales `crop` (straight RGBA) so its long side is 480 and centers it in a
/// transparent 512x512 frame. Resampling is Lanczos3 on premultiplied colors,
/// so transparent neighbors never bleed into the edges.
pub(crate) fn frame(crop: &RgbaImage) -> RgbaImage {
    let (w, h) = crop.dimensions();
    let (nw, nh) = fitted_size(w, h);
    let mut out = RgbaImage::new(FRAME_SIZE, FRAME_SIZE);
    let ox = i64::from((FRAME_SIZE - nw) / 2);
    let oy = i64::from((FRAME_SIZE - nh) / 2);
    if (nw, nh) == (w, h) {
        imageops::replace(&mut out, crop, ox, oy);
    } else {
        imageops::replace(&mut out, &resize_premultiplied(crop, nw, nh), ox, oy);
    }
    out
}

fn resize_premultiplied(crop: &RgbaImage, width: u32, height: u32) -> RgbaImage {
    let premultiplied = Rgba32FImage::from_fn(crop.width(), crop.height(), |x, y| {
        let p = crop.get_pixel(x, y);
        let a = f32::from(p[3]) / 255.0;
        Rgba([
            f32::from(p[0]) / 255.0 * a,
            f32::from(p[1]) / 255.0 * a,
            f32::from(p[2]) / 255.0 * a,
            a,
        ])
    });
    let resized = imageops::resize(&premultiplied, width, height, FilterType::Lanczos3);
    RgbaImage::from_fn(width, height, |x, y| {
        let p = resized.get_pixel(x, y);
        let a = p[3].clamp(0.0, 1.0);
        let alpha = (a * 255.0).round() as u8;
        if alpha == 0 {
            return Rgba([0, 0, 0, 0]);
        }
        let channel = |c: f32| ((c / a).clamp(0.0, 1.0) * 255.0).round() as u8;
        Rgba([channel(p[0]), channel(p[1]), channel(p[2]), alpha])
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Bounding box of the non-transparent pixels: (x, y, width, height).
    fn visible_box(img: &RgbaImage) -> (u32, u32, u32, u32) {
        let (mut x0, mut y0, mut x1, mut y1) = (u32::MAX, u32::MAX, 0, 0);
        for (x, y, p) in img.enumerate_pixels() {
            if p[3] > 0 {
                x0 = x0.min(x);
                y0 = y0.min(y);
                x1 = x1.max(x);
                y1 = y1.max(y);
            }
        }
        (x0, y0, x1 - x0 + 1, y1 - y0 + 1)
    }

    fn solid(w: u32, h: u32) -> RgbaImage {
        RgbaImage::from_pixel(w, h, Rgba([255, 0, 0, 255]))
    }

    #[test]
    fn frame_fitted_size() {
        assert_eq!(fitted_size(200, 100), (480, 240));
        assert_eq!(fitted_size(50, 100), (240, 480));
        assert_eq!(fitted_size(480, 480), (480, 480));
        assert_eq!(fitted_size(5000, 1), (480, 1));
        assert_eq!(fitted_size(3, 2), (480, 320));
        assert_eq!(fitted_size(7, 3), (480, 206));
    }

    #[test]
    fn frame_wide_sticker_offsets() {
        let out = frame(&solid(200, 100));
        assert_eq!(out.dimensions(), (512, 512));
        assert_eq!(visible_box(&out), (16, 136, 480, 240));
    }

    #[test]
    fn frame_tall_sticker_offsets() {
        let out = frame(&solid(50, 100));
        assert_eq!(visible_box(&out), (136, 16, 240, 480));
    }

    #[test]
    fn frame_identity_when_already_480() {
        let crop = RgbaImage::from_fn(480, 240, |x, y| Rgba([x as u8, y as u8, 7, 255]));
        let out = frame(&crop);
        assert_eq!(out.get_pixel(16, 136), crop.get_pixel(0, 0));
        assert_eq!(out.get_pixel(16 + 479, 136 + 239), crop.get_pixel(479, 239));
    }

    #[test]
    fn frame_margins_and_transparent_pixels() {
        let mut crop = solid(37, 91);
        for y in 0..91 {
            for x in 0..10 {
                crop.put_pixel(x, y, Rgba([0, 0, 0, 0]));
            }
        }
        let out = frame(&crop);
        for (x, y, p) in out.enumerate_pixels() {
            if !(16..496).contains(&x) || !(16..496).contains(&y) {
                assert_eq!(p[3], 0, "({x}, {y})");
            }
            if p[3] == 0 {
                assert_eq!(p.0, [0, 0, 0, 0]);
            }
        }
    }

    #[test]
    fn frame_red_edge_has_no_green() {
        // A red disc with soft alpha edges, scaled both up and down.
        for size in [40u32, 900] {
            let c = size as f32 / 2.0;
            let crop = RgbaImage::from_fn(size, size, |x, y| {
                let d = ((x as f32 - c).powi(2) + (y as f32 - c).powi(2)).sqrt();
                let a = ((c - d) * 40.0).clamp(0.0, 255.0) as u8;
                if a == 0 {
                    Rgba([0, 0, 0, 0])
                } else {
                    Rgba([255, 0, 0, a])
                }
            });
            let out = frame(&crop);
            assert!(out.pixels().any(|p| p[3] > 0 && p[3] < 255));
            for p in out.pixels().filter(|p| p[3] > 0) {
                assert_eq!((p[1], p[2]), (0, 0), "{p:?}");
            }
        }
    }
}
