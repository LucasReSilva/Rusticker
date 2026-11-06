use std::sync::Mutex;
use std::time::Duration;

use oxideav_webp::{encode_all, EncodeOptions, Frame, WebpImage};

static OUTPUT: Mutex<Vec<u8>> = Mutex::new(Vec::new());

#[no_mangle]
pub extern "C" fn encode_fixture() -> i32 {
    let encoded = (|| {
        let frames = (0..10u32)
            .map(|frame_index| {
                let mut rgba = vec![0u8; 32 * 32 * 4];
                let left = 2 + frame_index * 2;
                for y in 10..22 {
                    for x in left..left + 12 {
                        let offset = ((y * 32 + x) * 4) as usize;
                        rgba[offset..offset + 4].copy_from_slice(&[255, 0, 0, 255]);
                    }
                }
                WebpImage::from_rgba8(32, 32, rgba)
                    .map(|image| Frame::new(image, Some(Duration::from_millis(100))))
            })
            .collect::<Result<Vec<_>, _>>()?;

        encode_all(&frames, &EncodeOptions::default().with_loop_count(0))
    })();

    match encoded {
        Ok(bytes) => {
            *OUTPUT.lock().unwrap() = bytes;
            0
        }
        Err(_) => -1,
    }
}

#[no_mangle]
pub extern "C" fn output_ptr() -> usize {
    OUTPUT.lock().unwrap().as_ptr() as usize
}

#[no_mangle]
pub extern "C" fn output_len() -> usize {
    OUTPUT.lock().unwrap().len()
}
