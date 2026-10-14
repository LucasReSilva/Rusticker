//! Per-sticker crop with alpha from component membership and conservative edge RGB cleanup.

use image::{Rgb, Rgba, RgbaImage};

use crate::components::{Component, Labels};

/// Crops `component`'s bounding box out of the straight RGBA source.
///
/// Component membership is softened with a 3x3 box average (pixels outside the
/// bounding box count as transparent). Each source pixel's alpha is multiplied
/// by that coverage, preserving source opacity and transparency. Opaque edge
/// RGB is decontaminated only when it fits a bounded mixture of the selected
/// background and a nearby interior color from the same component. Color is
/// zeroed wherever alpha ends up 0.
pub(crate) fn extract(
    rgba: &[u8],
    width: u32,
    labels: &Labels,
    component: &Component,
    background: Rgb<u8>,
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

    let crop = CropContext {
        rgba,
        width,
        raw: &raw,
        padded_width: pw,
        component,
    };
    let mut out = RgbaImage::new(w, h);
    let image_height = labels.height();
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
            let source = [rgba[offset], rgba[offset + 1], rgba[offset + 2]];
            let corrected = if raw[(y + 1) * pw + x + 1] == 1
                && sum < 9
                && rgba[offset + 3] == 255
                && touches_opaque_background(
                    rgba,
                    width,
                    image_height,
                    labels,
                    sx as u32,
                    sy as u32,
                ) {
                interior_reference(&crop, (w, h), (x as u32, y as u32))
                    .and_then(|foreground| decontaminate(source, foreground, background.0))
                    .unwrap_or(source)
            } else {
                source
            };
            out.put_pixel(
                x as u32,
                y as u32,
                Rgba([corrected[0], corrected[1], corrected[2], alpha]),
            );
        }
    }
    out
}

struct CropContext<'a> {
    rgba: &'a [u8],
    width: u32,
    raw: &'a [u16],
    padded_width: usize,
    component: &'a Component,
}

fn touches_opaque_background(
    rgba: &[u8],
    width: u32,
    height: u32,
    labels: &Labels,
    x: u32,
    y: u32,
) -> bool {
    let x_start = x.saturating_sub(1);
    let y_start = y.saturating_sub(1);
    let x_end = x.saturating_add(1).min(width - 1);
    let y_end = y.saturating_add(1).min(height - 1);
    for neighbor_y in y_start..=y_end {
        for neighbor_x in x_start..=x_end {
            if labels.get_pixel(neighbor_x, neighbor_y)[0] != 0 {
                continue;
            }
            let offset = ((neighbor_y * width + neighbor_x) * 4) as usize;
            if rgba[offset + 3] > 0 {
                return true;
            }
        }
    }
    false
}

fn interior_reference(
    crop: &CropContext<'_>,
    dimensions: (u32, u32),
    point: (u32, u32),
) -> Option<[u8; 3]> {
    let (crop_width, crop_height) = dimensions;
    let (x, y) = point;
    let mut samples = [Vec::new(), Vec::new(), Vec::new()];
    for sample_y in y.saturating_sub(2)..=y.saturating_add(2).min(crop_height - 1) {
        for sample_x in x.saturating_sub(2)..=x.saturating_add(2).min(crop_width - 1) {
            if membership_coverage(crop.raw, crop.padded_width, sample_x, sample_y) != 9 {
                continue;
            }
            let source_x = crop.component.min_x + sample_x;
            let source_y = crop.component.min_y + sample_y;
            let offset = ((source_y * crop.width + source_x) * 4) as usize;
            if crop.rgba[offset + 3] != 255 {
                continue;
            }
            for (channel, sample) in samples.iter_mut().enumerate() {
                sample.push(crop.rgba[offset + channel]);
            }
        }
    }
    if samples[0].len() < 3 {
        return None;
    }
    let anchors: Vec<_> = samples[0]
        .iter()
        .zip(&samples[1])
        .zip(&samples[2])
        .map(|((red, green), blue)| [*red, *green, *blue])
        .collect();
    let color = anchors[0];
    if anchors.iter().any(|anchor| *anchor != color) {
        return None;
    }
    Some(color)
}

fn membership_coverage(raw: &[u16], padded_width: usize, x: u32, y: u32) -> u16 {
    let x = x as usize;
    let y = y as usize;
    (y..y + 3)
        .map(|row| {
            raw[row * padded_width + x..row * padded_width + x + 3]
                .iter()
                .sum::<u16>()
        })
        .sum()
}

fn decontaminate(candidate: [u8; 3], foreground: [u8; 3], background: [u8; 3]) -> Option<[u8; 3]> {
    if candidate == foreground || foreground == background {
        return None;
    }
    let mut lower = 0.0f64;
    let mut upper = 0.5f64;
    for channel in 0..3 {
        let f = f64::from(foreground[channel]);
        let b = f64::from(background[channel]);
        let c = f64::from(candidate[channel]);
        let delta = b - f;
        if delta == 0.0 {
            if c != f {
                return None;
            }
            continue;
        }
        let first = (c - 0.5 - f) / delta;
        let second = (c + 0.5 - f) / delta;
        lower = lower.max(first.min(second));
        upper = upper.min(first.max(second));
        if lower > upper {
            return None;
        }
    }
    (upper > 0.0).then_some(foreground)
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

    fn spill_scene(
        width: u32,
        height: u32,
        rect: (u32, u32, u32, u32),
        foreground: [u8; 3],
        background: [u8; 3],
        foreground_quarters: u8,
    ) -> (Vec<u8>, GrayImage, [u8; 3]) {
        let (left, top, rect_width, rect_height) = rect;
        let mut rgba = vec![0; (width * height * 4) as usize];
        for pixel in rgba.as_chunks_mut::<4>().0 {
            pixel.copy_from_slice(&[background[0], background[1], background[2], 255]);
        }
        let mut mask = GrayImage::new(width, height);
        let mut edge = [0; 3];
        for y in top..top + rect_height {
            for x in left..left + rect_width {
                mask.put_pixel(x, y, Luma([FOREGROUND]));
                let is_edge = x == left
                    || y == top
                    || x == left + rect_width - 1
                    || y == top + rect_height - 1;
                let color = if is_edge {
                    for channel in 0..3 {
                        edge[channel] = ((u16::from(foreground[channel])
                            * u16::from(foreground_quarters)
                            + u16::from(background[channel]) * u16::from(4 - foreground_quarters)
                            + 2)
                            / 4) as u8;
                    }
                    edge
                } else {
                    foreground
                };
                let offset = ((y * width + x) * 4) as usize;
                rgba[offset..offset + 4].copy_from_slice(&[color[0], color[1], color[2], 255]);
            }
        }
        (rgba, mask, edge)
    }

    fn extract_green(rgba: &[u8], width: u32, labels: &Labels, component: &Component) -> RgbaImage {
        extract(rgba, width, labels, component, Rgb([0, 255, 0]))
    }

    fn weighted_edge_error(image: &RgbaImage, reference: [u8; 3]) -> u64 {
        weighted_edge_color_error(image, None, reference)
    }

    fn weighted_edge_color_error(
        image: &RgbaImage,
        override_color: Option<[u8; 3]>,
        reference: [u8; 3],
    ) -> u64 {
        image
            .enumerate_pixels()
            .filter(|(x, y, pixel)| {
                pixel[3] > 0
                    && (*x == 0 || *y == 0 || *x + 1 == image.width() || *y + 1 == image.height())
            })
            .map(|(_, _, pixel)| {
                (0..3)
                    .map(|channel| {
                        let color = override_color.unwrap_or([pixel[0], pixel[1], pixel[2]]);
                        let delta = i64::from(pixel[3])
                            * (i64::from(color[channel]) - i64::from(reference[channel]));
                        (delta * delta) as u64
                    })
                    .sum::<u64>()
            })
            .sum()
    }

    #[test]
    fn alpha_solid_rectangle_soft_edge() {
        let (rgba, mask) = scene(40, 40, &[(5, 5, 20, 10)]);
        let (labels, comps) = find_components(&mask).unwrap();
        let out = extract_green(&rgba, 40, &labels, &comps[0]);
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
            let out = extract_green(&rgba, 10, &labels, &comps[0]);

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
        let out = extract_green(&rgba, 10, &labels, &comps[0]);

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
        let out = extract_green(&rgba, 10, &labels, &comps[0]);

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
        let out = extract_green(&rgba, 60, &labels, &ring);
        // A hole pixel far from the walls, and a pixel of the inner block.
        assert_eq!(out.get_pixel(9, 9), &Rgba([0, 0, 0, 0]));
        assert_eq!(out.get_pixel(15, 15), &Rgba([0, 0, 0, 0]));
        assert!(
            out.pixels()
                .filter(|p| p[3] == 0)
                .all(|p| p.0 == [0, 0, 0, 0])
        );
    }

    #[test]
    fn alpha_spill_fixtures_reduce_weighted_edge_error_without_changing_alpha() {
        let fixtures = [
            (
                [240, 16, 16],
                [16, 240, 16],
                [41_883_813_888, 10_470_953_472],
            ),
            (
                [16, 16, 240],
                [16, 240, 16],
                [41_883_813_888, 10_470_953_472],
            ),
            (
                [240, 16, 16],
                [128, 128, 128],
                [15_706_430_208, 3_926_607_552],
            ),
        ];
        for (foreground, background, expected_baselines) in fixtures {
            for (index, foreground_quarters) in [2, 3].into_iter().enumerate() {
                let (rgba, mask, edge) = spill_scene(
                    24,
                    24,
                    (4, 4, 16, 16),
                    foreground,
                    background,
                    foreground_quarters,
                );
                let (labels, components) = find_components(&mask).unwrap();
                let output = extract(&rgba, 24, &labels, &components[0], Rgb(background));
                let mut clean = rgba.clone();
                for y in 4..20 {
                    for x in 4..20 {
                        if x == 4 || y == 4 || x == 19 || y == 19 {
                            let offset = ((y * 24 + x) * 4) as usize;
                            clean[offset..offset + 3].copy_from_slice(&foreground);
                        }
                    }
                }
                let clean_output = extract(&clean, 24, &labels, &components[0], Rgb(background));
                assert_eq!(
                    output.pixels().map(|pixel| pixel[3]).collect::<Vec<_>>(),
                    clean_output
                        .pixels()
                        .map(|pixel| pixel[3])
                        .collect::<Vec<_>>()
                );
                let baseline = weighted_edge_color_error(&output, Some(edge), foreground);
                let error = weighted_edge_error(&output, foreground);
                let ratio = error as f64 / baseline as f64;
                assert_eq!(baseline, expected_baselines[index]);
                assert!(error < baseline, "edge error ratio {ratio}");
                eprintln!(
                    "edge error ratio: foreground={foreground:?}, background={background:?}, share={foreground_quarters}/4, baseline={baseline}, corrected={error}, ratio={ratio}"
                );
            }
        }
    }

    #[test]
    fn alpha_edge_preservation_fixtures_keep_alpha_geometry_and_uncertain_rgb() {
        let foreground = [240, 16, 16];
        let background = [16, 240, 16];
        let (mut rgba, mask, _) = spill_scene(24, 24, (4, 4, 16, 16), foreground, background, 2);
        for pixel in rgba.as_chunks_mut::<4>().0 {
            if pixel[3] == 255 && pixel[..3] != foreground && pixel[..3] != background {
                pixel[..3].copy_from_slice(&[180, 90, 50]);
            }
        }
        let (labels, components) = find_components(&mask).unwrap();
        let component = components[0];
        let output = extract_green(&rgba, 24, &labels, &component);
        assert_eq!(
            (
                component.min_x,
                component.min_y,
                component.width(),
                component.height()
            ),
            (4, 4, 16, 16)
        );
        assert_eq!(output.get_pixel(7, 7), &Rgba([240, 16, 16, 255]));
        assert_eq!(output.get_pixel(0, 0)[3], 113);
        assert_eq!(output.get_pixel(0, 0).0[..3], [180, 90, 50]);

        let mut transparent = vec![0; (24 * 24 * 4) as usize];
        for y in 4..20 {
            for x in 4..20 {
                let offset = ((y * 24 + x) * 4) as usize;
                transparent[offset..offset + 4].copy_from_slice(&[240, 16, 16, 255]);
            }
        }
        let transparent_output = extract_green(&transparent, 24, &labels, &component);
        assert_eq!(
            transparent_output.get_pixel(0, 0),
            &Rgba([240, 16, 16, 113])
        );
        assert!(
            transparent_output
                .pixels()
                .filter(|pixel| pixel[3] == 0)
                .all(|pixel| pixel.0 == [0, 0, 0, 0])
        );

        let (mut translucent, mask, _) =
            spill_scene(24, 24, (4, 4, 16, 16), foreground, background, 2);
        let edge_offset = ((5 * 24 + 4) * 4) as usize;
        translucent[edge_offset..edge_offset + 4].copy_from_slice(&[240, 16, 16, 128]);
        let (labels, components) = find_components(&mask).unwrap();
        let translucent_output = extract_green(&translucent, 24, &labels, &components[0]);
        assert_eq!(translucent_output.get_pixel(0, 1), &Rgba([240, 16, 16, 85]));
    }

    #[test]
    fn multicolored_interior_does_not_synthesize_a_false_reference() {
        let (mut rgba, mask, _) =
            spill_scene(24, 24, (4, 4, 16, 16), [240, 240, 240], [240, 240, 240], 4);
        for y in 5..19 {
            for x in 5..19 {
                let color = if (x + y) % 3 == 0 {
                    [16, 16, 240]
                } else if (x + y) % 3 == 1 {
                    [16, 240, 16]
                } else {
                    [240, 16, 16]
                };
                let offset = ((y * 24 + x) * 4) as usize;
                rgba[offset..offset + 3].copy_from_slice(&color);
            }
        }
        let ambiguous_edge = [72, 72, 72];
        // The top-edge candidate's 5x5 neighborhood contains ten eligible
        // anchors: four red, three green, and three blue.
        for (index, color) in [
            [240, 16, 16],
            [240, 16, 16],
            [240, 16, 16],
            [240, 16, 16],
            [16, 240, 16],
            [16, 240, 16],
            [16, 240, 16],
            [16, 16, 240],
            [16, 16, 240],
            [16, 16, 240],
        ]
        .into_iter()
        .enumerate()
        {
            let x = 7 + (index % 5) as u32;
            let y = 5 + (index / 5) as u32;
            let offset = ((y * 24 + x) * 4) as usize;
            rgba[offset..offset + 3].copy_from_slice(&color);
        }
        let offset = ((4 * 24 + 11) * 4) as usize;
        rgba[offset..offset + 3].copy_from_slice(&ambiguous_edge);

        let (labels, components) = find_components(&mask).unwrap();
        let output = extract(&rgba, 24, &labels, &components[0], Rgb([240, 240, 240]));
        assert_eq!(output.get_pixel(7, 0).0[..3], ambiguous_edge);
        assert_eq!(output.get_pixel(7, 0)[3], 170);
    }

    #[test]
    fn nonmember_boundary_pixels_are_not_rgb_decontaminated() {
        let foreground = [240, 16, 16];
        let background = [16, 240, 16];
        let (mut rgba, mut mask, _) =
            spill_scene(24, 24, (4, 4, 16, 16), foreground, background, 4);
        let x = 11;
        let y = 4;
        mask.put_pixel(x, y, Luma([0]));
        let offset = ((y * 24 + x) * 4) as usize;
        rgba[offset..offset + 4].copy_from_slice(&[128, 128, 16, 255]);

        let (labels, components) = find_components(&mask).unwrap();
        let component = components
            .iter()
            .find(|component| component.min_x == 4 && component.min_y == 4)
            .unwrap();
        let output = extract(&rgba, 24, &labels, component, Rgb(background));
        assert_eq!(output.get_pixel(x - 4, y - 4).0[..3], [128, 128, 16]);
    }
}
