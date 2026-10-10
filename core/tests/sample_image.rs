//! Local-only check against the private reference sample image.
//!
//! The image is never stored in the repository. Point `RUSTICKER_SAMPLE_IMAGE`
//! at its absolute path to run the check; without the variable (as in CI) the
//! test is skipped:
//!
//! ```sh
//! RUSTICKER_SAMPLE_IMAGE=/abs/path/to/sample.jpg \
//!     cargo test --release -p rusticker-core --test sample_image -- --nocapture
//! ```

use image::Rgb;
use rusticker_core::{Sticker, detect_stickers};

const VAR: &str = "RUSTICKER_SAMPLE_IMAGE";
const EXPECTED_ROWS: [usize; 3] = [5, 6, 6];

/// Doubled center of a sticker's bounding box: (2 * cx, 2 * cy).
fn center2(s: &Sticker) -> (u64, u64) {
    let b = s.bbox;
    (
        2 * u64::from(b.x) + u64::from(b.width),
        2 * u64::from(b.y) + u64::from(b.height),
    )
}

#[test]
fn sample_image_yields_17_stickers_in_reading_order() {
    let Some(path) = std::env::var_os(VAR).filter(|p| !p.is_empty()) else {
        eprintln!("skipped: {VAR} not set");
        return;
    };
    let image = image::open(&path)
        .unwrap_or_else(|e| panic!("{VAR} is set but {path:?} could not be read: {e}"))
        .to_rgba8();

    // Background: mean color of the 16x16 top-left block.
    let mut sum = [0u32; 3];
    for y in 0..16 {
        for x in 0..16 {
            let p = image.get_pixel(x, y);
            for (acc, &c) in sum.iter_mut().zip(&p.0[..3]) {
                *acc += u32::from(c);
            }
        }
    }
    let background = Rgb(sum.map(|s| (s / 256) as u8));

    let stickers = detect_stickers(&image, background, 50).expect("detection succeeds");
    for (i, s) in stickers.iter().enumerate() {
        eprintln!("sticker {i:2}: {:?}", s.bbox);
    }
    assert_eq!(stickers.len(), 17, "sticker count");

    let mut groups = Vec::new();
    let mut rest = stickers.as_slice();
    for n in EXPECTED_ROWS {
        let (row, tail) = rest.split_at(n);
        groups.push(row);
        rest = tail;
    }
    for (r, row) in groups.iter().enumerate() {
        for pair in row.windows(2) {
            assert!(
                center2(&pair[0]).0 < center2(&pair[1]).0,
                "row {r}: x-centers must increase"
            );
        }
    }
    for (r, pair) in groups.windows(2).enumerate() {
        let max_above = pair[0].iter().map(|s| center2(s).1).max().unwrap();
        let min_below = pair[1].iter().map(|s| center2(s).1).min().unwrap();
        assert!(
            max_above < min_below,
            "row {} must lie entirely above row {}",
            r,
            r + 1
        );
    }
}
