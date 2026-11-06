const modulePath = new URL("./target/wasm32-unknown-unknown/release/rusticker_animated_webp_wasm_probe.wasm", import.meta.url);
const outputPath = new URL("./target/wasm-output.webp", import.meta.url);
const moduleBytes = await Bun.file(modulePath).arrayBuffer();
const started = performance.now();
const { instance } = await WebAssembly.instantiate(moduleBytes);
console.log(`wasm_bytes=${moduleBytes.byteLength}`);
console.log(`instantiate_ms=${(performance.now() - started).toFixed(3)}`);
console.log(`wasm_linear_memory_before_encode_bytes=${instance.exports.memory.buffer.byteLength}`);

const encodeStarted = performance.now();
const status = instance.exports.encode_fixture();
if (status !== 0) throw new Error(`encode_fixture failed with status ${status}`);
const output = new Uint8Array(
  instance.exports.memory.buffer,
  instance.exports.output_ptr(),
  instance.exports.output_len(),
).slice();
await Bun.write(outputPath, output);
console.log(`encode_ms=${(performance.now() - encodeStarted).toFixed(3)}`);
console.log(`wasm_linear_memory_after_encode_bytes=${instance.exports.memory.buffer.byteLength}`);
console.log(`output_bytes=${output.byteLength}`);
console.log(`output_path=${outputPath.pathname}`);
