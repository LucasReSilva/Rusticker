<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Progress from './progress.svelte';

	const { Story } = defineMeta({
		title: 'Design System/Progress',
		component: Progress,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component:
						'A determinate progress indicator that communicates completion without relying on color alone.'
				}
			}
		},
		argTypes: {
			value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
			max: { control: 'number' }
		}
	});
</script>

<Story name="In Progress" args={{ value: 65, max: 100 }} />
<Story name="Complete" args={{ value: 100, max: 100 }} />
<Story name="Not Started" args={{ value: 0, max: 100 }} />
