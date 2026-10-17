const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");

delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

const candidates = {
  x4plus: {
    revision: "f75f074d9e6b1adfb6da9e2afce7308a986ec88d",
    repository: "qualcomm/Real-ESRGAN-x4plus",
    file: "Real-ESRGAN-x4plus.onnx",
    bytes: 67_123_162,
    sha256: "4e1ae0e47f80d9f4aa2a317c24fde2cb3e49a5381eed6e1d509b4001a4b97ad2",
  },
  anime6b: {
    revision: "c001be50fae1c7a2bae8b2b4dec5e6fcbdbcca96",
    repository: "skillsafe-ai/realesrgan-x4plus-anime-6b",
    file: "model.onnx",
    bytes: 17_939_975,
    sha256: "9a029dae374b2cd4c3eb2dbbed857e22e6d785687c767aa12828e7356b9fb378",
  },
  browserSnipAnime6b: {
    revision: "8e7094416ad91ec7477e968d348cd78742e20dc6",
    repository: "ningtoba/Browsersnip-Upscale",
    file: "public/models/realesrgan-x4plus-anime.onnx",
    bytes: 18_371_783,
    sha256: "153c74993748fba7ce112ab749d329effb15892a14c1992b76082c92bc4d11ef",
    url: "https://raw.githubusercontent.com/ningtoba/Browsersnip-Upscale/8e7094416ad91ec7477e968d348cd78742e20dc6/public/models/realesrgan-x4plus-anime.onnx",
  },
};
const name = process.argv[2] ?? "x4plus";
const candidate = candidates[name];
if (!candidate) throw new Error(`Unknown candidate: ${name}`);
const outputPath = path.join(os.tmpdir(), `rusticker-issue120-${name}.onnx`);
const url = candidate.url
  ?? `https://huggingface.co/${candidate.repository}/resolve/${candidate.revision}/${candidate.file}`;

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
  if (bytes !== candidate.bytes || sha256 !== candidate.sha256) {
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
