$ErrorActionPreference = 'Stop'
$probeDirectory = $PSScriptRoot
$manifest = Join-Path $probeDirectory 'Cargo.toml'
$wasmTarget = 'wasm32-unknown-unknown'

cargo build --locked --release --offline --target $wasmTarget --manifest-path $manifest
if ($LASTEXITCODE -ne 0) { throw "Offline WASM build failed ($LASTEXITCODE). Run the documented one-time dependency fetch first." }

bun (Join-Path $probeDirectory 'run-wasm.mjs')
if ($LASTEXITCODE -ne 0) { throw "Bun WASM encode probe failed ($LASTEXITCODE)." }

$output = Join-Path $probeDirectory 'target\wasm-output.webp'
cargo run --locked --offline --release --manifest-path $manifest --bin verify-output -- $output
if ($LASTEXITCODE -ne 0) { throw "Decoded-frame assertions failed ($LASTEXITCODE)." }

$actualHash = (Get-FileHash $output -Algorithm SHA256).Hash
$expectedHash = '53E9C9C2E64138C1743E70B02DB09BBA1D2A07E49D2E4A1BA231D0BEAF24E2EA'
if ($actualHash -ne $expectedHash) { throw "Unexpected output SHA-256: $actualHash" }
Write-Output "output_sha256=$actualHash"
