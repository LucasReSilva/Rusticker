import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

const modulePath = new URL(
  "./target/wasm32-unknown-unknown/release/rusticker_animated_webp_wasm_probe.wasm",
  import.meta.url,
);
const workerSource = await Bun.file(
  new URL("./browser-worker.mjs", import.meta.url),
).text();
const moduleBytes = await Bun.file(modulePath).arrayBuffer();
const outputPath = new URL("./target/browser-output.webp", import.meta.url);
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: () =>
    new Response("<!doctype html><title>Local codec evaluation</title>", {
      headers: { "Content-Type": "text/html" },
    }),
});
let socket;
let send;
let browserProcess;
const temporaryRoot = resolve(tmpdir());
const profile = await mkdtemp(join(temporaryRoot, "rusticker-codec-probe-"));
try {
  console.log("Launching local browser");
  // Use Bun's native WebSocket with a dedicated profile and loopback CDP socket.
  browserProcess = Bun.spawn(
    [
      process.env.PROBE_BROWSER_EXECUTABLE ||
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--remote-debugging-port=0",
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdout: "ignore", stderr: "pipe" },
  );
  let cdpPort;
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      cdpPort = (await readFile(join(profile, "DevToolsActivePort"), "utf8"))
        .split("\n")[0]
        .trim();
      if (/^\d+$/.test(cdpPort)) break;
    } catch {
      /* Chrome has not written the endpoint yet. */
    }
    if (browserProcess.exitCode !== null)
      throw new Error("Browser exited before creating CDP endpoint");
    await Bun.sleep(100);
  }
  if (!cdpPort) throw new Error("Browser CDP endpoint timed out");
  console.log(`Browser endpoint ready on loopback port ${cdpPort}`);
  const endpoint = `http://127.0.0.1:${cdpPort}`;
  const version = await (await fetch(`${endpoint}/json/version`)).json();
  const target = await (
    await fetch(`${endpoint}/json/new?${encodeURIComponent(server.url.href)}`, {
      method: "PUT",
    })
  ).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("CDP socket timed out")),
      15_000,
    );
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error("CDP socket failed"));
      },
      { once: true },
    );
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Runtime.consoleAPICalled")
      console.log(
        `browser: ${message.params.args.map((arg) => arg.value).join(" ")}`,
      );
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timeout);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timed out: ${method}`));
      }, 30_000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
  console.log(`Browser launched: ${version.Browser}`);
  await send("Runtime.enable");
  let pageReady = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    const state = await send("Runtime.evaluate", {
      expression: `location.href === ${JSON.stringify(server.url.href)} && document.readyState === 'complete'`,
      returnByValue: true,
    });
    if (state.result.value) {
      pageReady = true;
      break;
    }
    await Bun.sleep(50);
  }
  assert(pageReady, "Loopback page did not finish loading");
  await send("Network.enable");
  // All run inputs have been loaded locally; execute and restart workers offline.
  await send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  console.log("Starting offline Worker checks");
  const browserProbe = async ({ workerSource, moduleBytes }) => {
    const workerURL = URL.createObjectURL(
      new Blob([workerSource], { type: "text/javascript" }),
    );
    const liveWorkers = new Set();
    const assert = (condition, message) => {
      if (!condition) throw new Error(message);
    };
    const waitFor = (worker, type) =>
      new Promise((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timeout);
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
        };
        const onError = (event) => {
          cleanup();
          reject(
            new Error(
              `Worker error: ${event.message || event.type}; ${event.filename || "unknown source"}:${event.lineno || 0}`,
            ),
          );
        };
        const onMessage = ({ data }) => {
          if (data.type === "error") {
            cleanup();
            reject(new Error(data.message));
          } else if (data.type === type) {
            cleanup();
            resolve(data);
          }
        };
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error(`Worker timed out: ${type}`));
        }, 20_000);
        worker.addEventListener("message", onMessage);
        worker.addEventListener("error", onError);
      });
    const initialize = async () => {
      const worker = new Worker(workerURL);
      liveWorkers.add(worker);
      const ready = waitFor(worker, "ready");
      worker.postMessage({
        type: "initialize",
        moduleBytes: new Uint8Array(moduleBytes).buffer,
      });
      return { worker, ready: await ready };
    };
    try {
      const first = await initialize();
      console.log("Worker initialized");
      const complete = waitFor(first.worker, "complete");
      first.worker.postMessage({ type: "encode" });
      const encoded = await complete;
      console.log("Worker encoded fixture");
      first.worker.terminate();
      liveWorkers.delete(first.worker);

      // Cancellation is hard termination: synchronous WASM cannot receive an abort message.
      const cancelled = await initialize();
      let completedBeforeTermination = false;
      cancelled.worker.addEventListener("message", ({ data }) => {
        if (data.type === "complete") completedBeforeTermination = true;
      });
      const encoding = waitFor(cancelled.worker, "encoding");
      cancelled.worker.postMessage({ type: "encode" });
      await encoding;
      await new Promise((resolve) => setTimeout(resolve, 25));
      assert(
        !completedBeforeTermination,
        "Encode completed before cancellation could be exercised",
      );
      const terminationStarted = performance.now();
      cancelled.worker.terminate();
      liveWorkers.delete(cancelled.worker);
      const terminateCallMs = performance.now() - terminationStarted;
      await new Promise((resolve) => setTimeout(resolve, 250));
      assert(
        !completedBeforeTermination,
        "Terminated worker emitted a late output",
      );

      const restarted = await initialize();
      const restartedComplete = waitFor(restarted.worker, "complete");
      restarted.worker.postMessage({ type: "encode" });
      const recovered = await restartedComplete;
      console.log("Worker cancellation and recovery passed");
      assert(
        new Uint8Array(encoded.output).every(
          (value, index) => value === new Uint8Array(recovered.output)[index],
        ) && encoded.output.byteLength === recovered.output.byteLength,
        "Restarted worker output changed",
      );

      // Decode every frame with a different implementation from the Rust encoder.
      const decoder = new ImageDecoder({
        type: "image/webp",
        data: encoded.output,
      });
      try {
        await decoder.tracks.ready;
        await decoder.completed;
        assert(
          decoder.tracks.selectedTrack.frameCount === 10,
          "Expected ten animation frames",
        );
        const canvas = new OffscreenCanvas(32, 32);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        for (let index = 0; index < 10; index++) {
          const { image, complete } = await decoder.decode({
            frameIndex: index,
            completeFramesOnly: true,
          });
          try {
            assert(
              complete &&
                image.displayWidth === 32 &&
                image.displayHeight === 32,
              `Frame ${index} dimensions`,
            );
            assert(
              image.timestamp === index * 100_000 && image.duration === 100_000,
              `Frame ${index} timing`,
            );
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(image, 0, 0);
            const pixels = ctx.getImageData(0, 0, 32, 32).data;
            for (let y = 0; y < 32; y++)
              for (let x = 0; x < 32; x++) {
                const offset = (y * 32 + x) * 4;
                const inBar =
                  y >= 10 && y < 22 && x >= 2 + index * 2 && x < 14 + index * 2;
                assert(
                  pixels[offset + 3] === (inBar ? 255 : 0),
                  `Frame ${index} alpha at ${x},${y}`,
                );
                if (inBar)
                  assert(
                    pixels[offset] === 255 &&
                      pixels[offset + 1] === 0 &&
                      pixels[offset + 2] === 0,
                    `Frame ${index} color at ${x},${y}`,
                  );
              }
          } finally {
            image.close();
          }
        }
      } finally {
        decoder.close();
      }
      return {
        userAgent: navigator.userAgent,
        offline: !navigator.onLine,
        instantiateMs: first.ready.instantiateMs,
        encodeMs: encoded.encodeMs,
        linearMemoryBeforeBytes: first.ready.linearMemoryBeforeBytes,
        linearMemoryAfterBytes: encoded.linearMemoryAfterBytes,
        terminateCallMs,
        cancellation:
          "terminated after encoding message and 25 ms; no output during 250 ms observation; restart output identical",
        decodedFrames: 10,
        verifiedPixels: 10 * 32 * 32,
        output: Array.from(new Uint8Array(encoded.output)),
      };
    } finally {
      for (const worker of liveWorkers) worker.terminate();
      URL.revokeObjectURL(workerURL);
    }
  };
  const evaluation = await send("Runtime.evaluate", {
    expression: `(${browserProbe.toString()})(${JSON.stringify({ workerSource, moduleBytes: Array.from(new Uint8Array(moduleBytes)) })})`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluation.exceptionDetails)
    throw new Error(
      evaluation.exceptionDetails.exception?.description ||
        evaluation.exceptionDetails.text,
    );
  const result = evaluation.result.value;
  const output = new Uint8Array(result.output);
  const hash = new Bun.CryptoHasher("sha256")
    .update(output)
    .digest("hex")
    .toUpperCase();
  assert.equal(
    hash,
    "53E9C9C2E64138C1743E70B02DB09BBA1D2A07E49D2E4A1BA231D0BEAF24E2EA",
  );
  await Bun.write(outputPath, output);
  const { output: ignored, ...metrics } = result;
  console.log(
    JSON.stringify(
      {
        browser: version.Browser,
        wasmBytes: moduleBytes.byteLength,
        ...metrics,
        outputBytes: output.byteLength,
        sha256: hash,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error);
  throw error;
} finally {
  if (send && socket?.readyState === WebSocket.OPEN)
    await send("Browser.close").catch(() => {});
  socket?.close();
  if (browserProcess) {
    await Promise.race([browserProcess.exited, Bun.sleep(2_000)]);
    if (browserProcess.exitCode === null) browserProcess.kill();
  }
  await server.stop(true);
  assert(
    resolve(profile).startsWith(`${temporaryRoot}${sep}rusticker-codec-probe-`),
  );
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200,
  }).catch((error) =>
    console.error(`Temporary profile cleanup failed: ${error.code}`),
  );
}
