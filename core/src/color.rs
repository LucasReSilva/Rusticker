//! Background classification in the HSV color space (design D4).

use image::Rgb;

/// A color in HSV: hue in degrees `[0, 360)`, saturation and value in `[0, 1]`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Hsv {
    pub h: f32,
    pub s: f32,
    pub v: f32,
}

/// Converts an 8-bit RGB color to HSV. Achromatic colors get hue 0.
pub(crate) fn rgb_to_hsv(r: u8, g: u8, b: u8) -> Hsv {
    let r = f32::from(r) / 255.0;
    let g = f32::from(g) / 255.0;
    let b = f32::from(b) / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let delta = max - min;
    let v = max;
    let s = if max > 0.0 { delta / max } else { 0.0 };
    let h = if delta <= 0.0 {
        0.0
    } else if max == r {
        60.0 * ((g - b) / delta).rem_euclid(6.0)
    } else if max == g {
        60.0 * ((b - r) / delta + 2.0)
    } else {
        60.0 * ((r - g) / delta + 4.0)
    };
    let h = if h >= 360.0 { h - 360.0 } else { h };
    Hsv { h, s, v }
}

/// Circular distance between two hues, in degrees (`0..=180`).
pub(crate) fn hue_distance(a: f32, b: f32) -> f32 {
    let d = (a - b).abs() % 360.0;
    d.min(360.0 - d)
}

/// Precomputed background thresholds for one background color and tolerance.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Thresholds {
    background_rgb: [u8; 3],
    tolerance: u8,
    hue: f32,
    hue_half_width: f32,
    min_saturation: f32,
    min_value: f32,
}

impl Thresholds {
    /// Builds the thresholds for `background` and `tolerance` (0..=100).
    pub(crate) fn new(background: Rgb<u8>, tolerance: u8) -> Self {
        let bg = rgb_to_hsv(background[0], background[1], background[2]);
        let t = f32::from(tolerance.min(100));
        let loosen = 1.0 - t / 100.0;
        Self {
            background_rgb: background.0,
            tolerance,
            hue: bg.h,
            hue_half_width: t,
            min_saturation: (0.94 * loosen).min(bg.s),
            min_value: (0.48 * loosen).min(bg.v),
        }
    }

    /// Whether an HSV color counts as background.
    pub(crate) fn is_background_hsv(&self, hsv: Hsv) -> bool {
        hue_distance(hsv.h, self.hue) <= self.hue_half_width
            && hsv.s >= self.min_saturation
            && hsv.v >= self.min_value
    }

    /// Whether an RGB pixel counts as background.
    pub(crate) fn is_background(&self, r: u8, g: u8, b: u8) -> bool {
        if self.tolerance == 0 {
            return [r, g, b] == self.background_rgb;
        }
        self.is_background_hsv(rgb_to_hsv(r, g, b))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const GREEN: Rgb<u8> = Rgb([0, 255, 0]);

    fn bg(t: u8, hsv: Hsv) -> bool {
        Thresholds::new(GREEN, t).is_background_hsv(hsv)
    }

    #[test]
    fn color_hsv_conversion() {
        assert_eq!(
            rgb_to_hsv(0, 255, 0),
            Hsv {
                h: 120.0,
                s: 1.0,
                v: 1.0
            }
        );
        assert_eq!(
            rgb_to_hsv(255, 0, 0),
            Hsv {
                h: 0.0,
                s: 1.0,
                v: 1.0
            }
        );
        assert_eq!(
            rgb_to_hsv(0, 0, 255),
            Hsv {
                h: 240.0,
                s: 1.0,
                v: 1.0
            }
        );
        assert_eq!(
            rgb_to_hsv(255, 255, 255),
            Hsv {
                h: 0.0,
                s: 0.0,
                v: 1.0
            }
        );
        assert_eq!(
            rgb_to_hsv(0, 0, 0),
            Hsv {
                h: 0.0,
                s: 0.0,
                v: 0.0
            }
        );
        let magenta_red = rgb_to_hsv(255, 0, 128);
        assert!(magenta_red.h > 329.0 && magenta_red.h < 331.0);
    }

    #[test]
    fn color_hue_distance_is_circular() {
        assert_eq!(hue_distance(10.0, 350.0), 20.0);
        assert_eq!(hue_distance(120.0, 70.0), 50.0);
        assert_eq!(hue_distance(0.0, 180.0), 180.0);
    }

    #[test]
    fn color_green_band_at_tolerance_50() {
        let ok = |h| Hsv { h, s: 1.0, v: 1.0 };
        assert!(bg(50, ok(70.0)));
        assert!(bg(50, ok(71.0)));
        assert!(bg(50, ok(169.0)));
        assert!(bg(50, ok(170.0)));
        assert!(!bg(50, ok(69.0)));
        assert!(!bg(50, ok(171.0)));
        assert!(bg(
            50,
            Hsv {
                h: 120.0,
                s: 0.48,
                v: 1.0
            }
        ));
        assert!(!bg(
            50,
            Hsv {
                h: 120.0,
                s: 0.46,
                v: 1.0
            }
        ));
        assert!(bg(
            50,
            Hsv {
                h: 120.0,
                s: 1.0,
                v: 0.25
            }
        ));
        assert!(!bg(
            50,
            Hsv {
                h: 120.0,
                s: 1.0,
                v: 0.23
            }
        ));
    }

    #[test]
    fn color_white_is_foreground() {
        assert!(!Thresholds::new(GREEN, 50).is_background(255, 255, 255));
    }

    #[test]
    fn color_picked_color_is_background_at_zero_tolerance() {
        for c in [
            [0u8, 255, 0],
            [0, 177, 64],
            [40, 120, 60],
            [255, 0, 0],
            [10, 20, 200],
            [255, 255, 255],
            [0, 0, 0],
            [128, 128, 128],
            [200, 30, 150],
        ] {
            let t = Thresholds::new(Rgb(c), 0);
            assert!(t.is_background(c[0], c[1], c[2]), "{c:?}");
        }
    }

    #[test]
    fn color_zero_tolerance_matches_exact_rgb_only() {
        for background in [[0u8, 255, 0], [128, 128, 128], [255, 0, 255]] {
            let thresholds = Thresholds::new(Rgb(background), 0);
            assert!(thresholds.is_background(background[0], background[1], background[2]));
        }

        assert!(!Thresholds::new(GREEN, 0).is_background(0, 200, 0));
        assert!(!Thresholds::new(Rgb([128, 128, 128]), 0).is_background(255, 0, 0));
    }

    #[test]
    fn color_monotonic_in_tolerance() {
        let backgrounds = [[0u8, 255, 0], [0, 177, 64], [60, 90, 200], [200, 40, 40]];
        let mut pixels = Vec::new();
        for r in (0..=255).step_by(51) {
            for g in (0..=255).step_by(51) {
                for b in (0..=255).step_by(51) {
                    pixels.push([r as u8, g as u8, b as u8]);
                }
            }
        }
        for bgc in backgrounds {
            for t in (0..100).step_by(10) {
                let lower = Thresholds::new(Rgb(bgc), t as u8);
                let higher = Thresholds::new(Rgb(bgc), t as u8 + 10);
                for p in &pixels {
                    if lower.is_background(p[0], p[1], p[2]) {
                        assert!(
                            higher.is_background(p[0], p[1], p[2]),
                            "{bgc:?} t={t} {p:?}"
                        );
                    }
                }
            }
        }
    }
}
