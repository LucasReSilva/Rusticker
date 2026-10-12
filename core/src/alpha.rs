//! Per-sticker crop with alpha from component membership (design D6).

use image::{Rgba, RgbaImage};

use crate::components::{Component, Labels};

/// Crops `component`'s bounding box out of the straight RGBA source.
///
/// Component membership is softened with a 3x3 box average (pixels outside the
/// bounding box count as transparent). Each source pixel's alpha is multiplied
/// by that coverage, preserving source opacity and transparency. Color is
/// zeroed wherever alpha ends up 0.
pub(crate) fn extract(
    rgba: &[u8],
    width: u32,
    labels: &Labels,
    component: &Component,
) -> RgbaImage {
    let w = component.width();
    let h = component.height();
    let pw = (w + 2) as usize;
    let ph = (h + 2) as usize;

    // Raw membership (0 or 1), padded by one transparent pixel on every side.
    let mut raw = vec![0u16; pw * ph];
    for y in 0..h {
        for x in 0..w {
            if labels.get_pixel(component.min_x + x, component.min_y + y)[0] == component.label {
                raw[(y as usize + 1) * pw + x as usize + 1] = 1;
            }
        }
    }

    let mut out = RgbaImage::new(w, h);
    for y in 0..h as usize {
        for x in 0..w as usize {
            // (x, y) in the crop is (x + 1, y + 1) in the padded buffer, so its
            // 3x3 neighborhood spans rows y..=y+2 and columns x..=x+2.
            let mut sum = 0u16;
            for row in raw[y * pw..(y + 3) * pw].chunks_exact(pw) {
                sum += row[x] + row[x + 1] + row[x + 2];
            }
            let sx = component.min_x as usize + x;
            let sy = component.min_y as usize + y;
            let offset = (sy * width as usize + sx) * 4;
            let alpha = ((u32::from(sum) * u32::from(rgba[offset + 3]) + 4) / 9) as u8;
            if alpha == 0 {
                continue;
            }
            let p = &rgba[offset..offset + 3];
            out.put_pixel(x as u32, y as u32, Rgba([p[0], p[1], p[2], alpha]));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{GrayImage, Luma};

    use crate::components::find_components;
    use crate::mask::FOREGROUND;

    /// Builds an RGBA buffer (all one color) and a mask from foreground rectangles.
    fn scene(width: u32, height: u32, rects: &[(u32, u32, u32, u32)]) -> (Vec<u8>, GrayImage) {
        let mut mask = GrayImage::new(width, height);
        for &(x, y, w, h) in rects {
            for yy in y..y + h {
                for xx in x..x + w {
                    mask.put_pixel(xx, yy, Luma([FOREGROUND]));
                }
            }
        }
        let rgba = [200u8, 10, 20, 255].repeat((width * height) as usize);
        (rgba, mask)
    }

    #[test]
    fn alpha_solid_rectangle_soft_edge() {
        let (rgba, mask) = scene(40, 40, &[(5, 5, 20, 10)]);
        let (labels, comps) = find_components(&mask).unwrap();
        let out = extract(&rgba, 40, &labels, &comps[0]);
        assert_eq!(out.dimensions(), (20, 10));
        assert_eq!(out.get_pixel(5, 5), &Rgba([200, 10, 20, 255]));
        assert_eq!(out.get_pixel(5, 0)[3], 170);
        assert_eq!(out.get_pixel(0, 5)[3], 170);
        assert_eq!(out.get_pixel(0, 0)[3], 113);
        assert_eq!(out.get_pixel(19, 9)[3], 113);
    }

    #[test]
    fn alpha_preserves_source_opacity_and_rounds_coverage() {
        for (source_alpha, edge_alpha, corner_alpha) in [
            (1, 1, 0),
            (127, 85, 56),
            (128, 85, 57),
            (254, 169, 113),
            (255, 170, 113),
        ] {
            let (mut rgba, mask) = scene(10, 10, &[(2, 2, 5, 5)]);
            for pixel in rgba.as_chunks_mut::<4>().0 {
                pixel[3] = source_alpha;
            }
            let (labels, comps) = find_components(&mask).unwrap();
            let out = extract(&rgba, 10, &labels, &comps[0]);

            assert_eq!(out.get_pixel(2, 2), &Rgba([200, 10, 20, source_alpha]));
            assert_eq!(out.get_pixel(2, 0)[3], edge_alpha);
            assert_eq!(out.get_pixel(0, 0)[3], corner_alpha);
            if corner_alpha == 0 {
                assert_eq!(out.get_pixel(0, 0), &Rgba([0, 0, 0, 0]));
            }
            assert!(out.pixels().all(|pixel| pixel[3] <= source_alpha));
        }
    }

    #[test]
    fn alpha_transparent_source_stays_zero_near_foreground() {
        let (mut rgba, mut mask) = scene(10, 10, &[(2, 2, 5, 5)]);
        let offset = (4 * 10 + 4) * 4;
        rgba[offset..offset + 4].copy_from_slice(&[13, 97, 241, 0]);
        mask.put_pixel(4, 4, Luma([0]));
        let (labels, comps) = find_components(&mask).unwrap();
        let out = extract(&rgba, 10, &labels, &comps[0]);

        assert_eq!(out.get_pixel(2, 2), &Rgba([0, 0, 0, 0]));
        assert!(out.get_pixel(2, 1)[3] > 0);
        assert!(
            out.pixels()
                .filter(|pixel| pixel[3] == 0)
                .all(|pixel| pixel.0 == [0, 0, 0, 0])
        );
    }

    #[test]
    fn alpha_coverage_does_not_average_neighbor_opacity() {
        let (mut rgba, mask) = scene(10, 10, &[(2, 2, 5, 5)]);
        for (index, pixel) in rgba.as_chunks_mut::<4>().0.iter_mut().enumerate() {
            pixel[3] = if index % 2 == 0 { 1 } else { 255 };
        }
        rgba[(4 * 10 + 4) * 4 + 3] = 128;
        let (labels, comps) = find_components(&mask).unwrap();
        let out = extract(&rgba, 10, &labels, &comps[0]);

        assert_eq!(out.get_pixel(2, 2), &Rgba([200, 10, 20, 128]));
    }

    #[test]
    fn alpha_hole_and_other_label_are_transparent() {
        // A 30x30 ring with 5-pixel walls, and a separate block inside the hole.
        let (rgba, mask) = scene(
            60,
            60,
            &[
                (0, 0, 30, 5),
                (0, 25, 30, 5),
                (0, 5, 5, 20),
                (25, 5, 5, 20),
                (12, 12, 6, 6),
            ],
        );
        let (labels, mut comps) = find_components(&mask).unwrap();
        comps.sort_by_key(|c| std::cmp::Reverse(c.area));
        let ring = comps[0];
        assert_eq!((ring.width(), ring.height()), (30, 30));
        let out = extract(&rgba, 60, &labels, &ring);
        // A hole pixel far from the walls, and a pixel of the inner block.
        assert_eq!(out.get_pixel(9, 9), &Rgba([0, 0, 0, 0]));
        assert_eq!(out.get_pixel(15, 15), &Rgba([0, 0, 0, 0]));
        assert!(
            out.pixels()
                .filter(|p| p[3] == 0)
                .all(|p| p.0 == [0, 0, 0, 0])
        );
    }
}
