//! Test-only watershed candidate used to compare synthetic masks with the
//! production 8-connected component baseline. This is not shipped behavior.

use std::cmp::Ordering;
use std::collections::{BinaryHeap, VecDeque};

use image::{GrayImage, Luma};
use imageproc::distance_transform::euclidean_squared_distance_transform;
use imageproc::region_labelling::{Connectivity, connected_components};

const FOREGROUND: u8 = 255;

#[derive(Debug)]
struct Fixture {
    name: &'static str,
    mask: GrayImage,
    instances: Vec<GrayImage>,
}

#[derive(Debug, Clone, Copy)]
struct FloodPixel {
    height: u32,
    order: usize,
    index: usize,
    label: u32,
}

impl PartialEq for FloodPixel {
    fn eq(&self, other: &Self) -> bool {
        (self.height, self.order, self.index, self.label)
            == (other.height, other.order, other.index, other.label)
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
        self.height
            .cmp(&other.height)
            .then_with(|| other.order.cmp(&self.order))
            .then_with(|| other.index.cmp(&self.index))
            .then_with(|| other.label.cmp(&self.label))
    }
}

fn disk(cx: i32, cy: i32, radius: i32) -> GrayImage {
    let mut image = GrayImage::new(96, 80);
    for y in 0..80i32 {
        for x in 0..96i32 {
            if (x - cx).pow(2) + (y - cy).pow(2) <= radius.pow(2) {
                image.put_pixel(x as u32, y as u32, Luma([FOREGROUND]));
            }
        }
    }
    image
}

fn add_mask(target: &mut GrayImage, source: &GrayImage) {
    for (x, y, pixel) in source.enumerate_pixels() {
        if pixel[0] != 0 {
            target.put_pixel(x, y, Luma([FOREGROUND]));
        }
    }
}

fn union_instances(instances: &[GrayImage]) -> GrayImage {
    let mut mask = GrayImage::new(96, 80);
    for instance in instances {
        add_mask(&mut mask, instance);
    }
    mask
}

fn rectangle(x0: u32, y0: u32, x1: u32, y1: u32) -> GrayImage {
    let mut image = GrayImage::new(96, 80);
    for y in y0..y1 {
        for x in x0..x1 {
            image.put_pixel(x, y, Luma([FOREGROUND]));
        }
    }
    image
}

fn bridged_disks(bridge_width: u32) -> (GrayImage, Vec<GrayImage>) {
    let instances = vec![disk(30, 40, 15), disk(66, 40, 15)];
    let mut mask = union_instances(&instances);
    let y0 = 40 - bridge_width / 2;
    for y in y0..y0 + bridge_width {
        for x in 30..67 {
            mask.put_pixel(x, y, Luma([FOREGROUND]));
        }
    }
    (mask, instances)
}

fn star() -> GrayImage {
    let mut mask = GrayImage::new(96, 80);
    let (cx, cy) = (48.0f64, 40.0f64);
    for arm in 0..5 {
        let angle = std::f64::consts::TAU * arm as f64 / 5.0 - std::f64::consts::FRAC_PI_2;
        let (ex, ey) = (cx + angle.cos() * 22.0, cy + angle.sin() * 22.0);
        for step in 0..=100 {
            let t = step as f64 / 100.0;
            let (px, py) = (
                (cx + (ex - cx) * t).round() as i32,
                (cy + (ey - cy) * t).round() as i32,
            );
            for dy in -3..=3 {
                for dx in -3..=3 {
                    let (x, y) = (px + dx, py + dy);
                    if (0..96).contains(&x) && (0..80).contains(&y) {
                        mask.put_pixel(x as u32, y as u32, Luma([FOREGROUND]));
                    }
                }
            }
        }
    }
    mask
}

fn fixtures() -> Vec<Fixture> {
    let overlap = vec![disk(36, 40, 18), disk(58, 40, 18)];
    let touching_disks = vec![disk(33, 40, 15), disk(63, 40, 15)];
    let separated = vec![disk(30, 40, 14), disk(66, 40, 14)];
    let bridge_single = vec![disk(33, 40, 15), disk(63, 40, 15)];
    let mut dumbbell = union_instances(&bridge_single);
    for y in 38..43 {
        for x in 33..64 {
            dumbbell.put_pixel(x, y, Luma([FOREGROUND]));
        }
    }
    let ring = {
        let mut mask = disk(48, 40, 22);
        for y in 25..56 {
            for x in 33..64 {
                if (x as i32 - 48).pow(2) + (y as i32 - 40).pow(2) <= 15 * 15 {
                    mask.put_pixel(x, y, Luma([0]));
                }
            }
        }
        mask
    };
    let l_shape = {
        let mut mask = rectangle(28, 20, 40, 62);
        add_mask(&mut mask, &rectangle(28, 50, 70, 62));
        mask
    };
    let (bridge_3_mask, bridge_3_instances) = bridged_disks(3);
    let (bridge_1_mask, bridge_1_instances) = bridged_disks(1);
    let (bridge_6_mask, bridge_6_instances) = bridged_disks(6);
    let (bridge_12_mask, bridge_12_instances) = bridged_disks(12);
    let noisy_multi = {
        let mut mask = bridge_3_mask.clone();
        mask.put_pixel(5, 5, Luma([FOREGROUND]));
        mask.put_pixel(6, 5, Luma([FOREGROUND]));
        mask.put_pixel(5, 6, Luma([FOREGROUND]));
        mask
    };
    vec![
        Fixture {
            name: "overlapping-disks",
            mask: union_instances(&overlap),
            instances: overlap,
        },
        Fixture {
            name: "edge-touching-disks",
            mask: union_instances(&touching_disks),
            instances: touching_disks.clone(),
        },
        Fixture {
            name: "close-separated-disks",
            mask: union_instances(&separated),
            instances: separated,
        },
        Fixture {
            name: "noisy-touching-disks",
            mask: noisy_multi,
            instances: bridge_3_instances.clone(),
        },
        Fixture {
            name: "one-pixel-bridge",
            mask: bridge_1_mask,
            instances: bridge_1_instances,
        },
        Fixture {
            name: "three-pixel-bridge",
            mask: bridge_3_mask,
            instances: bridge_3_instances,
        },
        Fixture {
            name: "six-pixel-bridge",
            mask: bridge_6_mask,
            instances: bridge_6_instances,
        },
        Fixture {
            name: "twelve-pixel-bridge",
            mask: bridge_12_mask,
            instances: bridge_12_instances,
        },
        Fixture {
            name: "single-disk",
            mask: disk(48, 40, 20),
            instances: vec![disk(48, 40, 20)],
        },
        Fixture {
            name: "single-rectangle",
            mask: rectangle(24, 25, 72, 55),
            instances: vec![rectangle(24, 25, 72, 55)],
        },
        Fixture {
            name: "single-l-shape",
            mask: l_shape.clone(),
            instances: vec![l_shape],
        },
        Fixture {
            name: "single-ring",
            mask: ring.clone(),
            instances: vec![ring],
        },
        Fixture {
            name: "single-star",
            mask: star(),
            instances: vec![star()],
        },
        Fixture {
            name: "ambiguous-dumbbell-as-one",
            mask: dumbbell.clone(),
            instances: vec![dumbbell.clone()],
        },
        Fixture {
            name: "ambiguous-dumbbell-as-two",
            mask: dumbbell,
            instances: bridge_single,
        },
    ]
}

fn opened(mask: &GrayImage) -> GrayImage {
    imageproc::morphology::open(mask, imageproc::distance_transform::Norm::LInf, 1)
}

fn components(mask: &GrayImage) -> (image::ImageBuffer<Luma<u32>, Vec<u32>>, usize) {
    let labels = connected_components(mask, Connectivity::Eight, Luma([0]));
    let count = labels.pixels().map(|p| p[0]).max().unwrap_or(0) as usize;
    (labels, count)
}

fn watershed_candidate(mask: &GrayImage, min_peak_separation: u32) -> GrayImage {
    let mask = opened(mask);
    let (components, component_count) = components(&mask);
    let mut result = GrayImage::new(mask.width(), mask.height());
    let mut next_label = 1u32;

    for component_id in 1..=component_count as u32 {
        let pixels: Vec<(u32, u32)> = components
            .enumerate_pixels()
            .filter_map(|(x, y, pixel)| (pixel[0] == component_id).then_some((x, y)))
            .collect();
        if pixels.is_empty() {
            continue;
        }
        let min_x = pixels.iter().map(|p| p.0).min().unwrap().saturating_sub(1);
        let min_y = pixels.iter().map(|p| p.1).min().unwrap().saturating_sub(1);
        let max_x = pixels
            .iter()
            .map(|p| p.0)
            .max()
            .unwrap()
            .min(mask.width() - 1)
            + 1;
        let max_y = pixels
            .iter()
            .map(|p| p.1)
            .max()
            .unwrap()
            .min(mask.height() - 1)
            + 1;
        let width = max_x - min_x + 1;
        let height = max_y - min_y + 1;
        let mut inverted = GrayImage::from_pixel(width, height, Luma([FOREGROUND]));
        for &(x, y) in &pixels {
            inverted.put_pixel(x - min_x, y - min_y, Luma([0]));
        }
        let distance = euclidean_squared_distance_transform(&inverted);
        let mut seen = vec![false; (width * height) as usize];
        let mut peaks = Vec::<(u32, u32, u32)>::new();
        for y in 0..height {
            for x in 0..width {
                if inverted.get_pixel(x, y)[0] != 0 {
                    continue;
                }
                let index = (y * width + x) as usize;
                if seen[index] {
                    continue;
                }
                let level = distance.get_pixel(x, y)[0];
                let mut plateau = VecDeque::from([(x, y)]);
                seen[index] = true;
                let mut cells = Vec::new();
                let mut higher_neighbor = false;
                while let Some((px, py)) = plateau.pop_front() {
                    cells.push((px, py));
                    for ny in py.saturating_sub(1)..=(py + 1).min(height - 1) {
                        for nx in px.saturating_sub(1)..=(px + 1).min(width - 1) {
                            if nx == px && ny == py {
                                continue;
                            }
                            let n = distance.get_pixel(nx, ny)[0];
                            if n > level {
                                higher_neighbor = true;
                            }
                            let ni = (ny * width + nx) as usize;
                            if !seen[ni] && inverted.get_pixel(nx, ny)[0] == 0 && n == level {
                                seen[ni] = true;
                                plateau.push_back((nx, ny));
                            }
                        }
                    }
                }
                if !higher_neighbor {
                    cells.sort_by_key(|&(cx, cy)| (cy, cx));
                    let (px, py) = cells[0];
                    peaks.push((level as u32, px, py));
                }
            }
        }

        peaks.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| (a.2, a.1).cmp(&(b.2, b.1))));
        let max_peak = peaks.first().map_or(0, |p| p.0);
        let mut markers = Vec::<(u32, u32, u32)>::new();
        for peak in peaks {
            if peak.0 * 100 < max_peak * 25 {
                continue;
            }
            let too_close = markers.iter().any(|&(_, x, y)| {
                let dx = i64::from(x) - i64::from(peak.1);
                let dy = i64::from(y) - i64::from(peak.2);
                dx * dx + dy * dy < i64::from(min_peak_separation).pow(2)
            });
            if !too_close {
                markers.push(peak);
            }
        }
        if markers.is_empty() {
            continue;
        }

        let mut local_labels = vec![0u32; (width * height) as usize];
        let mut queue = BinaryHeap::new();
        let mut sequence = 0usize;
        for (marker_id, &(_, x, y)) in markers.iter().enumerate() {
            local_labels[(y * width + x) as usize] = marker_id as u32 + next_label;
            queue.push(FloodPixel {
                height: distance.get_pixel(x, y)[0] as u32,
                order: sequence,
                index: (y * width + x) as usize,
                label: marker_id as u32 + next_label,
            });
            sequence += 1;
        }
        while let Some(item) = queue.pop() {
            let x = item.index as u32 % width;
            let y = item.index as u32 / width;
            for ny in y.saturating_sub(1)..=(y + 1).min(height - 1) {
                for nx in x.saturating_sub(1)..=(x + 1).min(width - 1) {
                    let index = (ny * width + nx) as usize;
                    if inverted.get_pixel(nx, ny)[0] != 0 || local_labels[index] != 0 {
                        continue;
                    }
                    local_labels[index] = item.label;
                    queue.push(FloodPixel {
                        height: distance.get_pixel(nx, ny)[0] as u32,
                        order: sequence,
                        index,
                        label: item.label,
                    });
                    sequence += 1;
                }
            }
        }
        let labels_in_component = markers.len() as u32;
        for &(x, y) in &pixels {
            let local = ((y - min_y) * width + (x - min_x)) as usize;
            result.put_pixel(x, y, Luma([local_labels[local] as u8]));
        }
        next_label += labels_in_component;
    }
    result
}

fn label_count(labels: &GrayImage) -> usize {
    labels.pixels().map(|p| p[0]).max().unwrap_or(0) as usize
}

fn mean_matched_iou(predicted: &GrayImage, instances: &[GrayImage]) -> f64 {
    let labels = label_count(predicted);
    let mut matches = Vec::new();
    for (instance_index, instance) in instances.iter().enumerate() {
        for label in 1..=labels as u8 {
            let mut intersection = 0usize;
            let mut union = 0usize;
            for (x, y, truth) in instance.enumerate_pixels() {
                let actual = predicted.get_pixel(x, y)[0] == label;
                let expected = truth[0] != 0;
                intersection += usize::from(actual && expected);
                union += usize::from(actual || expected);
            }
            if union > 0 {
                matches.push((intersection as f64 / union as f64, instance_index, label));
            }
        }
    }
    matches.sort_by(|a, b| {
        b.0.total_cmp(&a.0)
            .then_with(|| a.1.cmp(&b.1))
            .then_with(|| a.2.cmp(&b.2))
    });
    let mut used_instances = vec![false; instances.len()];
    let mut used_labels = vec![false; labels + 1];
    let mut scores = Vec::new();
    for (iou, instance, label) in matches {
        if !used_instances[instance] && !used_labels[label as usize] {
            used_instances[instance] = true;
            used_labels[label as usize] = true;
            scores.push(iou);
        }
    }
    if scores.is_empty() {
        0.0
    } else {
        scores.iter().sum::<f64>() / scores.len() as f64
    }
}

fn assert_deterministic_and_report() {
    for fixture in fixtures() {
        assert_eq!(fixture.mask.dimensions(), (96, 80), "{}", fixture.name);
        assert!(
            fixture
                .instances
                .iter()
                .all(|instance| instance.dimensions() == (96, 80))
        );
        let opened_mask = opened(&fixture.mask);
        let (baseline_labels_raw, baseline_count) = components(&opened_mask);
        let baseline_labels = GrayImage::from_raw(
            opened_mask.width(),
            opened_mask.height(),
            baseline_labels_raw
                .pixels()
                .map(|pixel| pixel[0] as u8)
                .collect(),
        )
        .expect("component labels match fixture dimensions");
        let predicted = watershed_candidate(&fixture.mask, 8);
        let repeated = watershed_candidate(&fixture.mask, 8);
        assert_eq!(
            predicted, repeated,
            "{} must be deterministic",
            fixture.name
        );
        let predicted_count = label_count(&predicted);
        let expected_count = fixture.instances.len();
        let (expected_baseline, expected_candidate) = match fixture.name {
            "overlapping-disks"
            | "noisy-touching-disks"
            | "three-pixel-bridge"
            | "six-pixel-bridge"
            | "twelve-pixel-bridge" => (1, 2),
            "single-ring" => (1, 7),
            "single-star" => (1, 5),
            "ambiguous-dumbbell-as-one" | "ambiguous-dumbbell-as-two" => (1, 2),
            "single-disk" | "single-rectangle" | "single-l-shape" => (1, 1),
            "edge-touching-disks" | "close-separated-disks" | "one-pixel-bridge" => (2, 2),
            _ => panic!("unexpected fixture {}", fixture.name),
        };
        assert_eq!(
            baseline_count, expected_baseline,
            "{} baseline",
            fixture.name
        );
        assert_eq!(
            predicted_count, expected_candidate,
            "{} candidate",
            fixture.name
        );
        let baseline_false_splits = baseline_count.saturating_sub(expected_count);
        let baseline_missed_splits = expected_count.saturating_sub(baseline_count);
        let false_splits = predicted_count.saturating_sub(expected_count);
        let missed_splits = expected_count.saturating_sub(predicted_count);
        let foreground = opened_mask.pixels().filter(|p| p[0] != 0).count();
        let covered = opened_mask
            .enumerate_pixels()
            .filter(|(x, y, p)| p[0] != 0 && predicted.get_pixel(*x, *y)[0] != 0)
            .count();
        let coverage = covered as f64 / foreground.max(1) as f64;
        assert_eq!(coverage, 1.0, "{} foreground coverage", fixture.name);
        let baseline_iou = mean_matched_iou(&baseline_labels, &fixture.instances);
        let matched_iou = mean_matched_iou(&predicted, &fixture.instances);
        eprintln!(
            "{}: truth={}, components={} (missed={}, false={}, iou={:.3}), watershed={} (missed={}, false={}, iou={:.3}), coverage={:.3}",
            fixture.name,
            expected_count,
            baseline_count,
            baseline_missed_splits,
            baseline_false_splits,
            baseline_iou,
            predicted_count,
            missed_splits,
            false_splits,
            matched_iou,
            coverage
        );
    }
}

#[test]
fn watershed_candidate_is_deterministic_on_generated_fixture_families() {
    assert_deterministic_and_report();
}
