import animationData from './animation.json';

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
	const { default: lottie } = await import('lottie-web/build/player/lottie_svg');
	lottie.loadAnimation({ container: document.querySelector('#svg'), renderer: 'svg', loop: false, autoplay: true, animationData });
	window.__lottieReady = true;
} else {
	window.__lottieReady = false;
}
