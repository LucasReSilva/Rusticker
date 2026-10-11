//! Verification check against the reference sample image.
//!
//! Uses the bundled image at `samples/rust-stickers.png` by default.
//! Alternatively, point `RUSTICKER_SAMPLE_IMAGE` at an image path:
//!
//! ```sh
//! cargo test --release -p rusticker-core --test sample_image -- --nocapture
//! ```

use std::path::PathBuf;

use image::Rgb;
use rusticker_core::{Sticker, detect_stickers};

const VAR: &str = "RUSTICKER_SAMPLE_IMAGE";

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
    let path = std::env::var_os(VAR)
        .filter(|p| !p.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../samples/rust-stickers.png")
        });
    let image = image::open(&path)
        .unwrap_or_else(|e| panic!("failed to open sample image at {path:?}: {e}"))
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
    let expected_rows: &[usize] = match stickers.len() {
        31 => &[8, 8, 7, 8],
        17 => &[5, 6, 6],
        other => panic!("expected 31 (bundled) or 17 (private) stickers, got {other}"),
    };

    let mut groups = Vec::new();
    let mut rest = stickers.as_slice();
    for &n in expected_rows {
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
