const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const wasm = path.join(root, '..', 'target', 'wasm32-unknown-unknown', 'release', 'onnx_eval_lib.wasm');
const ortDist = path.join(root, 'onnxruntime', 'node_modules', 'onnxruntime-web', 'dist');
const files = new Map([
  ['/', path.join(root, 'index.html')],
  ['/worker.js', path.join(root, 'worker.js')],
  ['/onnx_eval_lib.wasm', wasm],
  ['/ort.html', path.join(root, 'ort.html')],
  ['/ort-worker.js', path.join(root, 'ort-worker.js')],
  ['/ort.wasm.min.mjs', path.join(ortDist, 'ort.wasm.min.mjs')],
  ['/ort-wasm-simd-threaded.mjs', path.join(ortDist, 'ort-wasm-simd-threaded.mjs')],
  ['/ort-wasm-simd-threaded.wasm', path.join(ortDist, 'ort-wasm-simd-threaded.wasm')],
  ['/model.onnx', process.env.ISSUE120_MODEL_PATH],
]);

http.createServer((request, response) => {
  const file = files.get(new URL(request.url, 'http://localhost').pathname);
  if (!file || !fs.existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Content-Type', file.endsWith('.wasm')
    ? 'application/wasm'
    : file.endsWith('.onnx') ? 'application/octet-stream'
      : file.endsWith('.js') || file.endsWith('.mjs') ? 'text/javascript' : 'text/html');
  fs.createReadStream(file).pipe(response);
}).listen(4179, '127.0.0.1', () => console.log('Listening on http://127.0.0.1:4179/'));
