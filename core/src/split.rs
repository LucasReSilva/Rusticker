//! Bounded, explicit split proposals for a single framed sticker.

use std::cmp::Ordering;
use std::collections::{BinaryHeap, VecDeque};

use image::{GrayImage, ImageBuffer, Luma, RgbaImage};
use imageproc::distance_transform::euclidean_squared_distance_transform;

use crate::{BBox, Sticker, frame};

const SIDE: u32 = 512;
const MIN_PEAK_SEPARATION: u32 = 8;
const MAX_MARKERS: usize = 4;

#[derive(Debug, Clone, Copy)]
struct FloodPixel {
    priority: u32,
    order: usize,
    index: usize,
    label: u32,
}

impl PartialEq for FloodPixel {
    fn eq(&self, other: &Self) -> bool {
        (self.priority, self.order, self.index, self.label)
            == (other.priority, other.order, other.index, other.label)
    }
}

impl Eq for FloodPixel {}

impl PartialOrd for FloodPixel {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for FloodPixel {
    fn cmp(&self, other: &Self) -> Ordering {
        self.priority
            .cmp(&other.priority)
            .then_with(|| other.order.cmp(&self.order))
            .then_with(|| other.index.cmp(&self.index))
            .then_with(|| other.label.cmp(&self.label))
    }
}

/// Proposes a marker-controlled split of an already framed sticker.
/// Returns an empty list when no bounded proposal is available.
pub(crate) fn propose(image: &RgbaImage) -> Vec<Sticker> {
    if image.dimensions() != (SIDE, SIDE) {
        return Vec::new();
    }
    let Some((min_x, min_y, max_x, max_y)) = alpha_bounds(image) else {
        return Vec::new();
    };
    let width = max_x - min_x + 3;
    let height = max_y - min_y + 3;
    let mut inverse = GrayImage::from_pixel(width, height, Luma([255]));
    for y in min_y..=max_y {
        for x in min_x..=max_x {
            if image.get_pixel(x, y)[3] > 0 {
                inverse.put_pixel(x - min_x + 1, y - min_y + 1, Luma([0]));
            }
        }
    }

    let distance = euclidean_squared_distance_transform(&inverse);
    let Some(markers) = find_markers(&inverse, &distance) else {
        return Vec::new();
    };
    if markers.len() < 2 || markers.len() > MAX_MARKERS {
        return Vec::new();
    }
    let Some(labels) = flood(&inverse, &distance, &markers) else {
        return Vec::new();
    };

    let mut boxes = vec![None::<(u32, u32, u32, u32)>; markers.len()];
    for y in min_y..=max_y {
        for x in min_x..=max_x {
            if image.get_pixel(x, y)[3] == 0 {
                continue;
            }
            let label = labels[((y - min_y + 1) * width + (x - min_x + 1)) as usize];
            if label == 0 || label as usize > markers.len() {
                return Vec::new();
            }
            let entry = &mut boxes[label as usize - 1];
            match entry {
                Some((left, top, right, bottom)) => {
                    *left = (*left).min(x);
                    *top = (*top).min(y);
                    *right = (*right).max(x);
                    *bottom = (*bottom).max(y);
                }
                None => *entry = Some((x, y, x, y)),
            }
        }
    }
    if boxes.iter().any(Option::is_none) {
        return Vec::new();
    }

    let mut proposals: Vec<Sticker> = boxes
        .into_iter()
        .enumerate()
        .filter_map(|(label, bounds)| {
            let (left, top, right, bottom) = bounds?;
            let mut crop = RgbaImage::new(right - left + 1, bottom - top + 1);
            for y in top..=bottom {
                for x in left..=right {
                    if labels[((y - min_y + 1) * width + (x - min_x + 1)) as usize]
                        == label as u32 + 1
                    {
                        crop.put_pixel(x - left, y - top, *image.get_pixel(x, y));
                    }
                }
            }
            let scale = |offset: u32, extent: u32| offset * extent / SIDE;
            let end = |offset: u32, extent: u32| (offset * extent).div_ceil(SIDE);
            let bbox = BBox {
                x: scale(left, image.width()),
                y: scale(top, image.height()),
                width: end(right + 1, image.width()) - scale(left, image.width()),
                height: end(bottom + 1, image.height()) - scale(top, image.height()),
            };
            Some(Sticker {
                bbox,
                image: frame::frame(&crop),
            })
        })
        .collect();
    if proposals.len() != markers.len() {
        return Vec::new();
    }
    let boxes: Vec<BBox> = proposals.iter().map(|sticker| sticker.bbox).collect();
    let ordered = crate::order::reading_order(&boxes);
    let mut ordered_proposals: Vec<Option<Sticker>> = proposals.drain(..).map(Some).collect();
    ordered
        .into_iter()
        .filter_map(|index| ordered_proposals[index].take())
        .collect()
}

fn alpha_bounds(image: &RgbaImage) -> Option<(u32, u32, u32, u32)> {
    let mut bounds: Option<(u32, u32, u32, u32)> = None;
    for (x, y, pixel) in image.enumerate_pixels() {
        if pixel[3] == 0 {
            continue;
        }
        match &mut bounds {
            Some((left, top, right, bottom)) => {
                *left = (*left).min(x);
                *top = (*top).min(y);
                *right = (*right).max(x);
                *bottom = (*bottom).max(y);
            }
            None => bounds = Some((x, y, x, y)),
        }
    }
    bounds
}

fn find_markers(
    inverse: &GrayImage,
    distance: &ImageBuffer<Luma<f64>, Vec<f64>>,
) -> Option<Vec<(u32, u32)>> {
    let (width, height) = inverse.dimensions();
    let mut seen = vec![false; (width * height) as usize];
    let mut peaks = Vec::<(u32, u32, u32)>::new();
    for y in 0..height {
        for x in 0..width {
            if inverse.get_pixel(x, y)[0] != 0 {
                continue;
            }
            let index = (y * width + x) as usize;
            if seen[index] {
                continue;
            }
            let level = distance.get_pixel(x, y)[0] as u32;
            let mut plateau = VecDeque::from([(x, y)]);
            seen[index] = true;
            let mut cells = Vec::new();
            let mut has_higher_neighbor = false;
            while let Some((px, py)) = plateau.pop_front() {
                cells.push((px, py));
                for ny in py.saturating_sub(1)..=(py + 1).min(height - 1) {
                    for nx in px.saturating_sub(1)..=(px + 1).min(width - 1) {
                        if nx == px && ny == py {
                            continue;
                        }
                        let neighbor_level = distance.get_pixel(nx, ny)[0] as u32;
                        has_higher_neighbor |= neighbor_level > level;
                        let neighbor = (ny * width + nx) as usize;
                        if !seen[neighbor]
                            && inverse.get_pixel(nx, ny)[0] == 0
                            && neighbor_level == level
                        {
                            seen[neighbor] = true;
                            plateau.push_back((nx, ny));
                        }
                    }
                }
            }
            if !has_higher_neighbor {
                cells.sort_by_key(|&(cx, cy)| (cy, cx));
                let (px, py) = cells[0];
                peaks.push((level, px, py));
            }
        }
    }
    peaks.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| (a.2, a.1).cmp(&(b.2, b.1))));
    let maximum = peaks.first()?.0;
    let mut markers = Vec::<(u32, u32, u32)>::new();
    for peak in peaks {
        if peak.0 * 100 < maximum * 25 {
            continue;
        }
        let too_close = markers.iter().any(|&(_, x, y)| {
            let dx = i64::from(x) - i64::from(peak.1);
            let dy = i64::from(y) - i64::from(peak.2);
            dx * dx + dy * dy < i64::from(MIN_PEAK_SEPARATION).pow(2)
        });
        if !too_close {
            markers.push(peak);
            if markers.len() > MAX_MARKERS {
                return Some(markers.into_iter().map(|(_, x, y)| (x, y)).collect());
            }
        }
    }
    Some(markers.into_iter().map(|(_, x, y)| (x, y)).collect())
}

fn flood(
    inverse: &GrayImage,
    distance: &ImageBuffer<Luma<f64>, Vec<f64>>,
    markers: &[(u32, u32)],
) -> Option<Vec<u32>> {
    let (width, height) = inverse.dimensions();
    let mut labels = vec![0u32; (width * height) as usize];
    let mut queue = BinaryHeap::new();
    let mut order = 0usize;
    for (index, &(x, y)) in markers.iter().enumerate() {
        let label = index as u32 + 1;
        let pixel_index = (y * width + x) as usize;
        labels[pixel_index] = label;
        queue.push(FloodPixel {
            priority: distance.get_pixel(x, y)[0] as u32,
            order,
            index: pixel_index,
            label,
        });
        order += 1;
    }
    while let Some(item) = queue.pop() {
        let x = item.index as u32 % width;
        let y = item.index as u32 / width;
        for ny in y.saturating_sub(1)..=(y + 1).min(height - 1) {
            for nx in x.saturating_sub(1)..=(x + 1).min(width - 1) {
                let index = (ny * width + nx) as usize;
                if inverse.get_pixel(nx, ny)[0] != 0 || labels[index] != 0 {
                    continue;
                }
                labels[index] = item.label;
                queue.push(FloodPixel {
                    priority: item.priority.min(distance.get_pixel(nx, ny)[0] as u32),
                    order,
                    index,
                    label: item.label,
                });
                order += 1;
            }
        }
    }
    if inverse
        .enumerate_pixels()
        .any(|(x, y, pixel)| pixel[0] == 0 && labels[(y * width + x) as usize] == 0)
    {
        return None;
    }
    Some(labels)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::Rgba;

    fn disk(image: &mut RgbaImage, cx: i32, cy: i32, radius: i32) {
        for y in 0..SIDE as i32 {
            for x in 0..SIDE as i32 {
                if (x - cx).pow(2) + (y - cy).pow(2) <= radius.pow(2) {
                    image.put_pixel(x as u32, y as u32, Rgba([255, 0, 0, 255]));
                }
            }
        }
    }

    fn pair(bridge: u32) -> RgbaImage {
        let mut image = RgbaImage::new(SIDE, SIDE);
        disk(&mut image, 220, 256, 90);
        disk(&mut image, 292, 256, 90);
        let start_y = 256 - bridge as i32 / 2;
        for y in start_y..start_y + bridge as i32 {
            for x in 220..=292 {
                image.put_pixel(x, y as u32, Rgba([255, 0, 0, 255]));
            }
        }
        image
    }

    #[test]
    fn proposes_two_deterministic_regions_for_overlapping_lobes() {
        let input = pair(3);
        let first = propose(&input);
        let second = propose(&input);
        assert_eq!(first, second);
        assert_eq!(first.len(), 2);
        assert!(
            first
                .iter()
                .all(|sticker| sticker.image.dimensions() == (SIDE, SIDE))
        );
    }

    #[test]
    fn exposes_ambiguous_dumbbell_candidate_for_user_review() {
        assert_eq!(propose(&pair(5)).len(), 2);
    }

    #[test]
    fn returns_no_proposal_for_single_disk_or_transparent_input() {
        let mut disk_image = RgbaImage::new(SIDE, SIDE);
        disk(&mut disk_image, 256, 256, 100);
        assert!(propose(&disk_image).is_empty());
        assert!(propose(&RgbaImage::new(SIDE, SIDE)).is_empty());
    }

    #[test]
    fn returns_no_proposal_for_single_disk_clipped_by_image_edge() {
        let mut image = RgbaImage::new(SIDE, SIDE);
        disk(&mut image, 8, 256, 40);
        assert!(propose(&image).is_empty());
    }

    #[test]
    fn returns_no_proposal_when_foreground_noise_is_disconnected() {
        let mut image = pair(3);
        image.put_pixel(5, 5, Rgba([255, 0, 0, 255]));
        assert!(propose(&image).is_empty());
    }

    #[test]
    fn returns_no_proposal_for_oversegmented_ring() {
        let mut ring = RgbaImage::new(SIDE, SIDE);
        disk(&mut ring, 256, 256, 115);
        for y in 170..343 {
            for x in 170..343 {
                if (x as i32 - 256).pow(2) + (y as i32 - 256).pow(2) <= 75 * 75 {
                    ring.put_pixel(x, y, Rgba([0, 0, 0, 0]));
                }
            }
        }
        assert!(propose(&ring).is_empty());
    }

    #[test]
    fn rejects_non_frame_dimensions() {
        assert!(propose(&RgbaImage::new(10, 10)).is_empty());
    }
}
