const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");

delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

const revision = "f75f074d9e6b1adfb6da9e2afce7308a986ec88d";
const expectedBytes = 67_123_162;
const expectedSha256 = "4e1ae0e47f80d9f4aa2a317c24fde2cb3e49a5381eed6e1d509b4001a4b97ad2";
const outputPath = path.join(os.tmpdir(), "rusticker-issue120-realesrgan-x4plus.onnx");
const url = `https://huggingface.co/qualcomm/Real-ESRGAN-x4plus/resolve/${revision}/Real-ESRGAN-x4plus.onnx`;

async function main() {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`);

  const hash = createHash("sha256");
  let bytes = 0;
  const digest = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  await pipeline(Readable.fromWeb(response.body), digest, fs.createWriteStream(outputPath));
  const sha256 = hash.digest("hex");
  if (bytes !== expectedBytes || sha256 !== expectedSha256) {
    fs.unlinkSync(outputPath);
    throw new Error(`Artifact mismatch: bytes=${bytes}, sha256=${sha256}`);
  }

  console.log(`path=${outputPath}`);
  console.log(`bytes=${bytes}`);
  console.log(`sha256=${sha256}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
