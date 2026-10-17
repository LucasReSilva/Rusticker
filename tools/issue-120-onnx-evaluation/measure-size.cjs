const fs = require("node:fs");
const path = require("node:path");
const { brotliCompressSync, constants } = require("node:zlib");

const modelPath = process.argv[2];
if (!modelPath) throw new Error("usage: bun measure-size.cjs <model.onnx>");

const wasmPath = path.join(__dirname, "target", "wasm32-unknown-unknown", "release", "onnx_eval_lib.wasm");
for (const [name, filePath] of [["model", modelPath], ["wasm_with_model", wasmPath]]) {
  const bytes = fs.readFileSync(filePath);
  const compressed = brotliCompressSync(bytes, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
  });
  console.log(`${name}_raw_bytes=${bytes.length}`);
  console.log(`${name}_brotli_q5_bytes=${compressed.length}`);
}
