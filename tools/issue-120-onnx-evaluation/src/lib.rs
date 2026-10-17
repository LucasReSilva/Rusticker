use std::{error::Error, io::Cursor};
use tract_onnx::prelude::*;

pub fn run_model(model_bytes: &[u8]) -> Result<(), Box<dyn Error>> {
    let model = tract_onnx::onnx().model_for_read(&mut Cursor::new(model_bytes))?;
    println!("inputs={}", model.input_outlets()?.len());

    let model = model.into_optimized()?;
    let input_fact = model.input_fact(0)?.clone();
    let shape: Vec<usize> = input_fact
        .shape
        .as_concrete()
        .ok_or("input shape is not concrete")?
        .iter()
        .copied()
        .collect();
    println!("input_shape={shape:?}");

    let input = Tensor::zero_dt(input_fact.datum_type, &shape)?;
    let runnable = model.into_runnable()?;
    #[cfg(not(target_arch = "wasm32"))]
    let start = std::time::Instant::now();
    let outputs = runnable.run(tvec!(input.into()))?;
    #[cfg(not(target_arch = "wasm32"))]
    println!("inference_ms={:.3}", start.elapsed().as_secs_f64() * 1000.0);
    for (index, output) in outputs.iter().enumerate() {
        println!("output_{index}_shape={:?}", output.shape());
        println!("output_{index}_datum_type={:?}", output.datum_type());
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
