//! 8-connected components, per-component statistics, and the size filter (design D5).

use image::{GrayImage, ImageBuffer, Luma};
use imageproc::region_labelling::{Connectivity, connected_components};

use crate::error::ErrorCode;

/// Per-pixel component labels; 0 is background.
pub(crate) type Labels = ImageBuffer<Luma<u32>, Vec<u32>>;

/// A connected foreground region that passed the size filter.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct Component {
    pub label: u32,
    pub area: u64,
    pub min_x: u32,
    pub min_y: u32,
    pub max_x: u32,
    pub max_y: u32,
}

impl Component {
    pub(crate) fn width(&self) -> u32 {
        self.max_x - self.min_x + 1
    }

    pub(crate) fn height(&self) -> u32 {
        self.max_y - self.min_y + 1
    }
}

/// Labels the foreground of `mask` with 8-connectivity and returns the labels
/// together with every component whose area is at least 0.4% of the image.
///
/// Fails with [`ErrorCode::NoStickers`] when no component is large enough.
pub(crate) fn find_components(mask: &GrayImage) -> Result<(Labels, Vec<Component>), ErrorCode> {
    let (width, height) = mask.dimensions();
    let labels = connected_components(mask, Connectivity::Eight, Luma([0u8]));

    let mut stats: Vec<Option<Component>> = Vec::new();
    for (x, y, pixel) in labels.enumerate_pixels() {
        let label = pixel[0];
        if label == 0 {
            continue;
        }
        let index = label as usize;
        if stats.len() <= index {
            stats.resize(index + 1, None);
        }
        match &mut stats[index] {
            Some(c) => {
                c.area += 1;
                c.min_x = c.min_x.min(x);
                c.min_y = c.min_y.min(y);
                c.max_x = c.max_x.max(x);
                c.max_y = c.max_y.max(y);
            }
            slot @ None => {
                *slot = Some(Component {
                    label,
                    area: 1,
                    min_x: x,
                    min_y: y,
                    max_x: x,
                    max_y: y,
                });
            }
        }
    }

    let image_area = u64::from(width) * u64::from(height);
    let kept: Vec<Component> = stats
        .into_iter()
        .flatten()
        .filter(|c| c.area * 1000 >= 4 * image_area)
        .collect();

    if kept.is_empty() {
        return Err(ErrorCode::NoStickers);
    }
    Ok((labels, kept))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mask::FOREGROUND;

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
    fn components_diagonal_touch_merges() {
        let mask = mask_with(20, 20, &[(0, 0, 5, 5), (5, 5, 5, 5)]);
        let (_, comps) = find_components(&mask).unwrap();
        assert_eq!(comps.len(), 1);
        assert_eq!(comps[0].area, 50);
    }

    #[test]
    fn components_area_filter() {
        // 3,600 px (0.36%) dropped, 4,000 px (0.4%) kept.
        let mask = mask_with(1000, 1000, &[(10, 10, 60, 60), (500, 500, 80, 50)]);
        let (_, comps) = find_components(&mask).unwrap();
        assert_eq!(comps.len(), 1);
        assert_eq!(comps[0].area, 4000);
    }

    #[test]
    fn components_only_small_regions_is_no_stickers() {
        let mask = mask_with(1000, 1000, &[(10, 10, 60, 60)]);
        assert_eq!(find_components(&mask).unwrap_err(), ErrorCode::NoStickers);
        let empty = GrayImage::new(10, 10);
        assert_eq!(find_components(&empty).unwrap_err(), ErrorCode::NoStickers);
    }

    #[test]
    fn components_bbox() {
        let mask = mask_with(100, 100, &[(10, 20, 50, 30)]);
        let (labels, comps) = find_components(&mask).unwrap();
        let c = comps[0];
        assert_eq!((c.min_x, c.min_y, c.width(), c.height()), (10, 20, 50, 30));
        assert_eq!(labels.get_pixel(10, 20)[0], c.label);
        assert_eq!(labels.get_pixel(9, 20)[0], 0);
    }
}
