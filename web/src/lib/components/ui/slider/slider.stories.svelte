<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Slider from './slider.svelte';

	const { Story } = defineMeta({
		title: 'Design System/Slider',
		component: Slider,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: { component: 'Keyboard-operable controls for adjusting one value or a range.' }
			}
		},
		argTypes: {
			value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
			min: { control: 'number' },
			max: { control: 'number' },
			step: { control: 'number' }
		}
	});
</script>

<Story
	name="Single Value"
	args={{ value: [40], min: 0, max: 100, step: 1, thumbLabel: 'Quality' }}
/>
<Story
	name="Range"
	args={{ value: [30, 70], min: 0, max: 100, step: 1, thumbLabel: 'Selection boundary' }}
/>
<Story
	name="Disabled"
	args={{ value: [50], min: 0, max: 100, step: 1, thumbLabel: 'Quality', disabled: true }}
/>
