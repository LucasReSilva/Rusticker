self.onmessage = async ({ data }) => {
  const startedAt = performance.now();
  const response = await fetch(data.wasm);
  if (!response.ok) throw new Error(`WASM fetch failed: ${response.status}`);
  const wasmBytes = await response.arrayBuffer();
  const wasmModule = await WebAssembly.compile(wasmBytes);
  let instance;
  const imports = {};
  for (const item of WebAssembly.Module.imports(wasmModule)) {
    imports[item.module] ??= {};
    imports[item.module][item.name] = (...args) => {
      if (item.name.includes('getRandomValues')) {
        const [pointer, length] = args;
        crypto.getRandomValues(new Uint8Array(instance.memory.buffer, pointer, length));
      }
      if (item.name.includes('table_grow')) return 0;
      return undefined;
    };
  }
  instance = (await WebAssembly.instantiate(wasmModule, imports)).exports;
  const initializedAt = performance.now();
  const exitCode = instance.run_exact_graph();
  self.postMessage({
    status: exitCode === 0 ? 'passed' : 'failed',
    wasmBytes: wasmBytes.byteLength,
    compileMs: +(initializedAt - startedAt).toFixed(1),
    initializeAndInferenceMs: +(performance.now() - initializedAt).toFixed(1),
    totalMs: +(performance.now() - startedAt).toFixed(1),
    exitCode,
    userAgent: navigator.userAgent,
  });
};
