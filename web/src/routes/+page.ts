// The tool runs only in the browser (wasm, workers, canvas). Each locale gets a
// prerendered script-only shell at <locale>/index.html, hence the trailing slash.
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'always';
