use std::{error::Error, io::Cursor};
use tract_onnx::prelude::*;

pub fn run_model(model_bytes: &[u8]) -> Result<(), Box<dyn Error>> {
    let mut model = tract_onnx::onnx().model_for_read(&mut Cursor::new(model_bytes))?;
    println!("inputs={}", model.input_outlets()?.len());

    let dynamic_input = model.input_fact(0)?.shape.as_concrete_finite()?.is_none();
    if dynamic_input {
        model.set_input_fact(0, f32::fact([1, 3, 64, 64]).into())?;
    }

    let model = model.into_optimized()?;
    let input_fact = model.input_fact(0)?.clone();
    let shape: Vec<usize> = input_fact
        .shape
        .as_concrete()
        .ok_or("input shape is not concrete")?
        .to_vec();
    println!("input_shape={shape:?}");

    let mut input = Tensor::zero_dt(input_fact.datum_type, &shape)?;
    if dynamic_input {
        let mut pixels = input.to_plain_array_view_mut::<f32>()?;
        for channel in 0..3 {
            for y in 0_usize..64 {
                for x in 0_usize..64 {
                    let flat = if x < 32 { 0.15 } else { 0.75 };
                    let line = if x.abs_diff(y) < 2 { 1.0 } else { flat };
                    pixels[[0, channel, y, x]] = line;
                }
            }
        }
        println!("fixture=64x64_flat_regions_and_diagonal_line");
    }
    let runnable = model.into_runnable()?;
    #[cfg(not(target_arch = "wasm32"))]
    let start = std::time::Instant::now();
    let outputs = runnable.run(tvec!(input.into()))?;
    #[cfg(not(target_arch = "wasm32"))]
    println!("inference_ms={:.3}", start.elapsed().as_secs_f64() * 1000.0);
    for (index, output) in outputs.iter().enumerate() {
        println!("output_{index}_shape={:?}", output.shape());
        println!("output_{index}_datum_type={:?}", output.datum_type());
        let values = output.to_plain_array_view::<f32>()?;
        let finite = values.iter().all(|value| value.is_finite());
        println!("output_{index}_finite={}", finite);
        println!(
            "output_{index}_range={:?}",
            values
                .iter()
                .copied()
                .fold((f32::INFINITY, f32::NEG_INFINITY), |(min, max), value| {
                    (min.min(value), max.max(value))
                })
        );
        if !finite {
            return Err("non-finite model output".into());
        }
    }
    Ok(())
}

#[cfg(target_arch = "wasm32")]
static MODEL: &[u8] = include_bytes!(env!("ISSUE120_MODEL_PATH"));

#[cfg(target_arch = "wasm32")]
#[unsafe(no_mangle)]
pub extern "C" fn run_exact_graph() -> u32 {
    match std::panic::catch_unwind(|| run_model(MODEL)) {
        Ok(Ok(())) => 0,
        _ => 1,
    }
}
