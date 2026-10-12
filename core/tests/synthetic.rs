//! Spec scenarios for `sticker-detection`, run through the public API on
//! images painted in code (no fixture files).

use image::{Rgb, Rgba, RgbaImage};
use rusticker_core::{BBox, ErrorCode, Sticker, detect_rgba, detect_stickers};

const GREEN: [u8; 3] = [0, 255, 0];
const GREEN_HEX: u32 = 0x00FF00;
const RED: [u8; 3] = [255, 0, 0];
const BLUE: [u8; 3] = [0, 0, 255];
const YELLOW: [u8; 3] = [255, 255, 0];

fn canvas(width: u32, height: u32) -> RgbaImage {
    RgbaImage::from_pixel(width, height, Rgba([0, 255, 0, 255]))
}

fn fill(img: &mut RgbaImage, x: u32, y: u32, w: u32, h: u32, color: [u8; 3]) {
    for yy in y..y + h {
        for xx in x..x + w {
            img.put_pixel(xx, yy, Rgba([color[0], color[1], color[2], 255]));
        }
    }
}

fn fill_rgba(img: &mut RgbaImage, x: u32, y: u32, w: u32, h: u32, color: [u8; 4]) {
    for yy in y..y + h {
        for xx in x..x + w {
            img.put_pixel(xx, yy, Rgba(color));
        }
    }
}

fn detect(img: &RgbaImage) -> Result<Vec<Sticker>, ErrorCode> {
    let stickers = detect_stickers(img, Rgb(GREEN), 50)?;
    for s in &stickers {
        assert_frame_invariants(s);
    }
    Ok(stickers)
}

fn bbox(s: &Sticker) -> [u32; 4] {
    let BBox {
        x,
        y,
        width,
        height,
    } = s.bbox;
    [x, y, width, height]
}

/// 512x512, transparent 16-pixel margin, and no color in transparent pixels.
fn assert_frame_invariants(s: &Sticker) {
    assert_eq!(s.image.dimensions(), (512, 512));
    for (x, y, p) in s.image.enumerate_pixels() {
        if !(16..496).contains(&x) || !(16..496).contains(&y) {
            assert_eq!(p[3], 0, "margin pixel ({x}, {y}) must be transparent");
        }
        if p[3] == 0 {
            assert_eq!(
                p.0,
                [0, 0, 0, 0],
                "transparent pixel ({x}, {y}) carries color"
            );
        }
    }
}

/// Bounding box of the non-transparent output pixels: [x, y, width, height].
fn visible_box(img: &RgbaImage) -> [u32; 4] {
    let (mut x0, mut y0, mut x1, mut y1) = (u32::MAX, u32::MAX, 0, 0);
    for (x, y, p) in img.enumerate_pixels() {
        if p[3] > 0 {
            x0 = x0.min(x);
            y0 = y0.min(y);
            x1 = x1.max(x);
            y1 = y1.max(y);
        }
    }
    [x0, y0, x1 - x0 + 1, y1 - y0 + 1]
}

fn center_color(s: &Sticker) -> [u8; 3] {
    let p = s.image.get_pixel(256, 256);
    assert_eq!(p[3], 255);
    [p[0], p[1], p[2]]
}

#[test]
fn valid_input_is_processed() {
    let mut img = canvas(300, 200);
    fill(&mut img, 50, 50, 40, 40, RED);
    let result = detect_rgba(img.as_raw(), 300, 200, GREEN_HEX, 50);
    assert!(matches!(result, Ok(_) | Err(ErrorCode::NoStickers)));
    let black = detect_rgba(&vec![0; 240_000], 300, 200, GREEN_HEX, 50);
    assert!(matches!(black, Ok(_) | Err(ErrorCode::NoStickers)));
}

#[test]
fn transparent_hidden_rgb_black_merges_stickers_and_becomes_visible() {
    let mut img = RgbaImage::from_pixel(320, 240, Rgba([0, 0, 0, 0]));
    fill(&mut img, 40, 50, 60, 60, RED);
    fill(&mut img, 220, 50, 60, 60, BLUE);

    let stickers = detect_stickers(&img, Rgb(GREEN), 50).unwrap();

    // Characterize today's RGB-only mask: hidden black fills the canvas as one
    // foreground component, and generated alpha makes that source transparent.
    assert_eq!(stickers.len(), 1);
    assert_eq!(bbox(&stickers[0]), [0, 0, 320, 240]);
    assert_eq!(stickers[0].image.get_pixel(256, 256)[3], 255);
}

#[test]
fn transparent_hidden_rgb_matching_green_keeps_separate_stickers() {
    let mut img = RgbaImage::from_pixel(320, 240, Rgba([0, 255, 0, 0]));
    fill(&mut img, 40, 50, 60, 60, RED);
    fill(&mut img, 220, 50, 60, 60, BLUE);

    let stickers = detect_stickers(&img, Rgb(GREEN), 50).unwrap();

    // This control demonstrates that current success depends on hidden RGB,
    // even though both canvas variants are fully transparent.
    assert_eq!(
        stickers.iter().map(bbox).collect::<Vec<_>>(),
        vec![[40, 50, 60, 60], [220, 50, 60, 60]]
    );
}

#[test]
fn partially_transparent_sticker_is_made_opaque() {
    let mut img = canvas(240, 160);
    fill_rgba(&mut img, 80, 40, 80, 80, [255, 0, 0, 128]);

    let stickers = detect(&img).unwrap();

    assert_eq!(stickers.len(), 1);
    assert_eq!(bbox(&stickers[0]), [80, 40, 80, 80]);
    assert_eq!(stickers[0].image.get_pixel(256, 256)[3], 255);
}

#[test]
fn selected_chromatic_non_green_backgrounds_separate_stickers_at_zero_tolerance() {
    for background in [[0, 0, 255], [255, 0, 255], [255, 128, 0]] {
        let mut img = RgbaImage::from_pixel(
            240,
            160,
            Rgba([background[0], background[1], background[2], 255]),
        );
        fill(&mut img, 20, 40, 60, 60, RED);
        fill(&mut img, 160, 40, 60, 60, GREEN);

        let stickers = detect_stickers(&img, Rgb(background), 0).unwrap();

        assert_eq!(
            stickers.iter().map(bbox).collect::<Vec<_>>(),
            vec![[20, 40, 60, 60], [160, 40, 60, 60]],
            "background {background:?}"
        );
    }
}

#[test]
fn gray_background_at_zero_tolerance_removes_red_but_keeps_blue() {
    let gray = [128, 128, 128];
    let mut img = RgbaImage::from_pixel(240, 160, Rgba([gray[0], gray[1], gray[2], 255]));
    fill(&mut img, 20, 40, 60, 60, RED);
    fill(&mut img, 160, 40, 60, 60, BLUE);

    let stickers = detect_stickers(&img, Rgb(gray), 0).unwrap();

    // The current HSV rule gives achromatic gray and red the same hue (0°).
    assert_eq!(
        stickers.iter().map(bbox).collect::<Vec<_>>(),
        vec![[160, 40, 60, 60]]
    );
}

#[test]
fn three_stickers_in_one_row_in_order() {
    let mut img = canvas(600, 200);
    fill(&mut img, 20, 50, 150, 100, RED);
    fill(&mut img, 220, 50, 150, 100, BLUE);
    fill(&mut img, 420, 50, 150, 100, YELLOW);
    let stickers = detect(&img).unwrap();
    assert_eq!(stickers.len(), 3);
    let colors: Vec<_> = stickers.iter().map(center_color).collect();
    assert_eq!(colors, vec![RED, BLUE, YELLOW]);
}

#[test]
fn two_rows_with_mixed_heights() {
    let mut img = canvas(400, 220);
    fill(&mut img, 250, 10, 80, 100, RED); // tall, top right: rows 10-109
    fill(&mut img, 20, 80, 60, 20, BLUE); // short, top left: rows 80-99
    fill(&mut img, 20, 150, 60, 50, YELLOW); // second row, left
    fill(&mut img, 250, 150, 60, 50, RED); // second row, right
    let stickers = detect(&img).unwrap();
    let boxes: Vec<_> = stickers.iter().map(bbox).collect();
    assert_eq!(
        boxes,
        vec![
            [20, 80, 60, 20],
            [250, 10, 80, 100],
            [20, 150, 60, 50],
            [250, 150, 60, 50],
        ]
    );
}

#[test]
fn row_break_when_center_reaches_row_bottom() {
    let mut img = canvas(400, 300);
    fill(&mut img, 300, 0, 50, 100, RED); // rows 0-99, bottom 100
    fill(&mut img, 20, 90, 50, 20, BLUE); // center exactly at 100
    let stickers = detect(&img).unwrap();
    assert_eq!(
        stickers.iter().map(bbox).collect::<Vec<_>>(),
        vec![[300, 0, 50, 100], [20, 90, 50, 20]]
    );
}

#[test]
fn rectangle_bounding_box() {
    let mut img = canvas(100, 100);
    fill(&mut img, 10, 20, 50, 30, RED);
    let stickers = detect(&img).unwrap();
    assert_eq!(stickers.len(), 1);
    assert_eq!(bbox(&stickers[0]), [10, 20, 50, 30]);
}

#[test]
fn touching_stickers_merge() {
    // Shared edge.
    let mut img = canvas(300, 200);
    fill(&mut img, 20, 20, 100, 100, RED);
    fill(&mut img, 120, 20, 100, 100, BLUE);
    assert_eq!(detect(&img).unwrap().len(), 1);

    // A 3-pixel-thick bridge.
    let mut img = canvas(300, 200);
    fill(&mut img, 20, 20, 100, 100, RED);
    fill(&mut img, 120, 60, 40, 3, YELLOW);
    fill(&mut img, 160, 20, 100, 100, BLUE);
    let stickers = detect(&img).unwrap();
    assert_eq!(stickers.len(), 1);
    assert_eq!(bbox(&stickers[0]), [20, 20, 240, 100]);

    // Diagonal touch.
    let mut img = canvas(300, 300);
    fill(&mut img, 20, 20, 100, 100, RED);
    fill(&mut img, 120, 120, 100, 100, BLUE);
    assert_eq!(detect(&img).unwrap().len(), 1);
}

#[test]
fn interior_gap_is_transparent() {
    let mut img = canvas(600, 600);
    fill(&mut img, 60, 60, 480, 40, RED);
    fill(&mut img, 60, 500, 480, 40, RED);
    fill(&mut img, 60, 100, 40, 400, RED);
    fill(&mut img, 500, 100, 40, 400, RED);
    let stickers = detect(&img).unwrap();
    assert_eq!(stickers.len(), 1);
    assert_eq!(bbox(&stickers[0]), [60, 60, 480, 480]);
    let out = &stickers[0].image;
    // Not rescaled: bbox (bx, by) maps to output (16 + bx, 16 + by). The hole
    // spans bbox 40..440; pixels more than 1 pixel away from the walls.
    for by in 42..438 {
        for bx in 42..438 {
            assert_eq!(out.get_pixel(16 + bx, 16 + by)[3], 0);
        }
    }
    assert_eq!(out.get_pixel(16 + 20, 16 + 20)[3], 255);
}

#[test]
fn neighbor_inside_bounding_box_is_excluded() {
    let mut img = canvas(600, 600);
    // L shape: vertical bar plus horizontal foot.
    fill(&mut img, 50, 50, 60, 400, RED);
    fill(&mut img, 50, 390, 400, 60, RED);
    // A separate block in the L's notch, not touching it.
    fill(&mut img, 200, 100, 150, 150, BLUE);
    let stickers = detect(&img).unwrap();
    assert_eq!(stickers.len(), 2);
    let l = stickers
        .iter()
        .find(|s| bbox(s) == [50, 50, 400, 400])
        .unwrap();
    // The bbox is 400x400, scaled by 480/400 = 1.2; check the block's center.
    let bx = (275 - 50) as f32 * 1.2;
    let by = (175 - 50) as f32 * 1.2;
    let p = l.image.get_pixel(16 + bx as u32, 16 + by as u32);
    assert_eq!(p.0, [0, 0, 0, 0]);
    assert!(l.image.pixels().filter(|p| p[3] > 0).all(|p| p[2] == 0));
}

#[test]
fn soft_edge_on_unscaled_sticker() {
    let mut img = canvas(600, 400);
    fill(&mut img, 60, 80, 480, 240, RED);
    let stickers = detect(&img).unwrap();
    let out = &stickers[0].image;
    let (ox, oy) = (16, 136);
    for y in 0..240 {
        for x in 0..480 {
            let a = out.get_pixel(ox + x, oy + y)[3];
            if (2..478).contains(&x) && (2..238).contains(&y) {
                assert_eq!(a, 255);
            }
            if x == 0 || y == 0 || x == 479 || y == 239 {
                assert!(a > 0 && a < 255, "boundary ({x}, {y}) alpha {a}");
            }
        }
    }
}

#[test]
fn framing_offsets() {
    let mut img = canvas(400, 300);
    fill(&mut img, 20, 20, 200, 100, RED);
    fill(&mut img, 300, 150, 50, 100, BLUE);
    let stickers = detect(&img).unwrap();
    assert_eq!(bbox(&stickers[0]), [20, 20, 200, 100]);
    assert_eq!(visible_box(&stickers[0].image), [16, 136, 480, 240]);
    assert_eq!(bbox(&stickers[1]), [300, 150, 50, 100]);
    assert_eq!(visible_box(&stickers[1].image), [136, 16, 240, 480]);
}

#[test]
fn jpeg_speck_is_ignored() {
    let mut img = canvas(600, 200);
    fill(&mut img, 20, 50, 150, 100, RED);
    fill(&mut img, 220, 50, 150, 100, BLUE);
    fill(&mut img, 420, 50, 150, 100, YELLOW);
    fill(&mut img, 300, 180, 2, 2, RED);
    assert_eq!(detect(&img).unwrap().len(), 3);
}

#[test]
fn small_region_is_discarded() {
    let mut img = canvas(1000, 1000);
    fill(&mut img, 100, 100, 100, 100, RED);
    fill(&mut img, 600, 600, 60, 60, BLUE);
    let stickers = detect(&img).unwrap();
    assert_eq!(stickers.len(), 1);
    assert_eq!(bbox(&stickers[0]), [100, 100, 100, 100]);
}

#[test]
fn region_at_threshold_is_kept() {
    let mut img = canvas(1000, 1000);
    fill(&mut img, 300, 300, 80, 50, RED);
    let stickers = detect(&img).unwrap();
    assert_eq!(stickers.len(), 1);
    assert_eq!(bbox(&stickers[0]), [300, 300, 80, 50]);
}

#[test]
fn background_only_is_no_stickers() {
    assert_eq!(detect(&canvas(200, 100)), Err(ErrorCode::NoStickers));
}

#[test]
fn only_noise_is_no_stickers() {
    let mut img = canvas(1000, 1000);
    for i in 0..20 {
        fill(&mut img, 10 + 45 * i, 10 + 45 * i, 2, 2, RED);
    }
    fill(&mut img, 500, 100, 60, 60, BLUE);
    assert_eq!(detect(&img), Err(ErrorCode::NoStickers));
}

#[test]
fn invalid_input_paths() {
    let ok = canvas(10, 10);
    let buf = ok.as_raw();
    assert_eq!(
        detect_rgba(&[], 0, 100, GREEN_HEX, 50),
        Err(ErrorCode::InvalidInput)
    );
    assert_eq!(
        detect_rgba(&buf[..399], 10, 10, GREEN_HEX, 50),
        Err(ErrorCode::InvalidInput)
    );
    assert_eq!(
        detect_rgba(buf, 10, 10, GREEN_HEX, 101),
        Err(ErrorCode::InvalidInput)
    );
    assert_eq!(
        detect_rgba(buf, 10, 10, 0x0100_0000, 50),
        Err(ErrorCode::InvalidInput)
    );
    assert_eq!(
        detect_stickers(&ok, Rgb(GREEN), 101),
        Err(ErrorCode::InvalidInput)
    );
}

#[test]
fn image_too_large_paths() {
    assert_eq!(
        detect_rgba(&vec![0; 8193 * 4], 8193, 1, GREEN_HEX, 50),
        Err(ErrorCode::ImageTooLarge)
    );
    assert_eq!(
        detect_rgba(&[0; 16], 8000, 5001, GREEN_HEX, 50),
        Err(ErrorCode::ImageTooLarge)
    );
}

#[test]
fn largest_accepted_image() {
    let buffer = [0u8, 255, 0, 255].repeat(8000 * 5000);
    assert_eq!(
        detect_rgba(&buffer, 8000, 5000, GREEN_HEX, 50),
        Err(ErrorCode::NoStickers)
    );
    let wide = [0u8, 255, 0, 255].repeat(8192);
    assert_eq!(
        detect_rgba(&wide, 8192, 1, GREEN_HEX, 50),
        Err(ErrorCode::NoStickers)
    );
}

#[test]
fn deterministic_results() {
    let mut img = canvas(500, 400);
    fill(&mut img, 20, 20, 120, 80, RED);
    fill(&mut img, 200, 30, 90, 150, BLUE);
    fill(&mut img, 60, 250, 300, 100, YELLOW);
    let a = detect_rgba(img.as_raw(), 500, 400, GREEN_HEX, 50).unwrap();
    let b = detect_rgba(img.as_raw(), 500, 400, GREEN_HEX, 50).unwrap();
    assert_eq!(a, b);
}
