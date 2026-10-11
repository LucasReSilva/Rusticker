//! Reading order: rows top to bottom, left to right within a row (design D8).

use crate::BBox;

/// Returns the indices of `boxes` in reading order.
///
/// Uses doubled integer coordinates so centers are exact:
/// `cy2 = 2y + h`, `bottom2 = 2(y + h)`, `cx2 = 2x + w`.
pub(crate) fn reading_order(boxes: &[BBox]) -> Vec<usize> {
    let cx2 = |b: &BBox| 2 * u64::from(b.x) + u64::from(b.width);
    let cy2 = |b: &BBox| 2 * u64::from(b.y) + u64::from(b.height);
    let bottom2 = |b: &BBox| 2 * (u64::from(b.y) + u64::from(b.height));

    let mut by_center: Vec<usize> = (0..boxes.len()).collect();
    by_center.sort_by_key(|&i| (cy2(&boxes[i]), cx2(&boxes[i])));

    let mut rows: Vec<Vec<usize>> = Vec::new();
    let mut row_bottom2 = 0;
    for i in by_center {
        let b = &boxes[i];
        match rows.last_mut() {
            Some(row) if cy2(b) < row_bottom2 => {
                row.push(i);
                row_bottom2 = row_bottom2.max(bottom2(b));
            }
            _ => {
                rows.push(vec![i]);
                row_bottom2 = bottom2(b);
            }
        }
    }

    rows.into_iter()
        .flat_map(|mut row| {
            row.sort_by_key(|&i| (cx2(&boxes[i]), boxes[i].y));
            row
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn b(x: u32, y: u32, width: u32, height: u32) -> BBox {
        BBox {
            x,
            y,
            width,
            height,
        }
    }

    #[test]
    fn order_mixed_heights_and_second_row() {
        let boxes = [
            b(300, 150, 50, 50), // second row, right (rows 150-199)
            b(200, 10, 80, 100), // tall, top right (rows 10-109)
            b(10, 150, 50, 50),  // second row, left
            b(10, 80, 50, 20),   // short, top left (rows 80-99)
        ];
        assert_eq!(reading_order(&boxes), vec![3, 1, 2, 0]);
    }

    #[test]
    fn order_center_at_row_bottom_starts_new_row() {
        // First box spans rows 0-99 (bottom 100); the second's center is exactly 100.
        let boxes = [b(500, 0, 50, 100), b(0, 90, 50, 20)];
        assert_eq!(reading_order(&boxes), vec![0, 1]);
        // A center just above the bottom joins the row and sorts first by x.
        let boxes = [b(500, 0, 50, 100), b(0, 89, 50, 20)];
        assert_eq!(reading_order(&boxes), vec![1, 0]);
    }

    #[test]
    fn order_ties_by_center_x_then_top() {
        // Boxes 0 and 1 share center x; the smaller top comes first.
        let boxes = [b(0, 20, 40, 60), b(10, 0, 20, 100), b(100, 40, 10, 30)];
        assert_eq!(reading_order(&boxes), vec![1, 0, 2]);
    }

    #[test]
    fn order_empty() {
        assert!(reading_order(&[]).is_empty());
    }
}
