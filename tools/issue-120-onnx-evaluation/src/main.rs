use onnx_eval_lib::run_model;
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let model_path = std::env::args()
        .nth(1)
        .ok_or("usage: issue-120-onnx-evaluation <model.onnx>")?;
    let model_bytes = std::fs::read(model_path)?;
    run_model(&model_bytes)
}
