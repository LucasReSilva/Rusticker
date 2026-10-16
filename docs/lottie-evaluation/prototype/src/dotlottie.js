import animationData from './animation.json';

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
	const { DotLottie } = await import('@lottiefiles/dotlottie-web');
	DotLottie.setWasmUrl('/assets/dotlottie-player.wasm');
	const player = new DotLottie({
		canvas: document.querySelector('#canvas'),
		data: animationData,
		loop: false,
		autoplay: true
	});
	player.addEventListener('load', () => document.body.dataset.playerState = 'loaded');
	player.addEventListener('loadError', (event) => document.body.dataset.playerError = event.message ?? 'load error');
	player.addEventListener('renderError', (event) => document.body.dataset.playerError = event.message ?? 'render error');
	window.__dotLottieReady = true;
} else {
	window.__dotLottieReady = false;
}
