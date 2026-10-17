const fs = require("node:fs");
const path = require("node:path");

const wasmPath = process.argv[2]
  ?? path.join(__dirname, "target", "wasm32-unknown-unknown", "release", "onnx_eval_lib.wasm");
const wasmBytes = fs.readFileSync(wasmPath);
const wasmModule = new WebAssembly.Module(wasmBytes);
let instance;
const imports = {};

for (const item of WebAssembly.Module.imports(wasmModule)) {
  imports[item.module] ??= {};
  imports[item.module][item.name] = (...args) => {
    if (item.name.includes("getRandomValues")) {
      const [pointer, length] = args;
      globalThis.crypto.getRandomValues(new Uint8Array(instance.memory.buffer, pointer, length));
      return undefined;
    }
    if (item.name.includes("table_grow")) return 0;
    return undefined;
  };
}

instance = new WebAssembly.Instance(wasmModule, imports).exports;
const startedAt = Date.now();
const exitCode = instance.run_exact_graph();
console.log(`wasm_bytes=${wasmBytes.length}`);
console.log(`exit_code=${exitCode}`);
console.log(`elapsed_ms=${Date.now() - startedAt}`);
if (exitCode !== 0) process.exitCode = 1;
