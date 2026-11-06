// Evaluation only: the worker accepts the locally built module, never user media.
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "initialize") {
      const started = performance.now();
      const { instance } = await WebAssembly.instantiate(data.moduleBytes);
      self.instance = instance;
      self.postMessage({
        type: "ready",
        instantiateMs: performance.now() - started,
        linearMemoryBeforeBytes: instance.exports.memory.buffer.byteLength,
      });
    } else if (data.type === "encode") {
      self.postMessage({ type: "encoding" });
      const started = performance.now();
      const { exports } = self.instance;
      const status = exports.encode_fixture();
      if (status !== 0) throw new Error(`encode_fixture failed: ${status}`);
      const output = new Uint8Array(
        exports.memory.buffer,
        exports.output_ptr(),
        exports.output_len(),
      ).slice();
      self.postMessage(
        {
          type: "complete",
          encodeMs: performance.now() - started,
          linearMemoryAfterBytes: exports.memory.buffer.byteLength,
          output: output.buffer,
        },
        [output.buffer],
      );
    }
  } catch (error) {
    self.postMessage({ type: "error", message: String(error) });
  }
};
