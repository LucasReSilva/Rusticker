import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageWasm = resolve(root, 'node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm');
const outputDirectory = resolve(root, 'dist/assets');

await mkdir(outputDirectory, { recursive: true });
await copyFile(packageWasm, resolve(outputDirectory, 'dotlottie-player.wasm'));
