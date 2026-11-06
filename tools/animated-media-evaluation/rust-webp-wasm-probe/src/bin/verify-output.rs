use std::env;
use std::fs;
use std::process;

use oxideav_webp::decode_all;

fn main() {
    let Some(path) = env::args_os().nth(1) else {
        eprintln!("usage: verify-output <animated-webp-file>");
        process::exit(2);
    };
    let bytes = fs::read(path).expect("read generated WebP");
    let frames = decode_all(&bytes).expect("decode generated animated WebP");
    assert_eq!(frames.len(), 10, "frame count");

    for (index, frame) in frames.iter().enumerate() {
        assert_eq!((frame.image.width, frame.image.height), (32, 32));
        assert_eq!(frame.delay, Some(std::time::Duration::from_millis(100)));
        let rgba = frame.image.to_rgba8();
        assert_eq!(&rgba[3..4], &[0], "frame {index} top-left alpha");

        let bar_x = 2 + index as u32 * 2 + 5;
        let bar_y = 15;
        let offset = ((bar_y * 32 + bar_x) * 4) as usize;
        assert_eq!(
            &rgba[offset..offset + 4],
            &[255, 0, 0, 255],
            "frame {index} bar pixel"
        );
        println!("frame={index} duration_ms=100 corner_alpha=0 bar_rgba=255,0,0,255");
    }
}
