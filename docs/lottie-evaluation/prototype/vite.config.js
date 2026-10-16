import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				index: resolve(import.meta.dirname, 'index.html'),
				css: resolve(import.meta.dirname, 'css.html'),
				svg: resolve(import.meta.dirname, 'svg.html'),
				dotlottie: resolve(import.meta.dirname, 'dotlottie.html')
			}
		}
	}
});
