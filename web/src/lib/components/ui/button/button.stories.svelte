<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from './button.svelte';

	const { Story } = defineMeta({
		title: 'Design System/Button',
		component: Button,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: { component: 'Semantic action controls with accessible variants and sizes.' }
			}
		},
		argTypes: {
			variant: {
				control: 'select',
				options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link']
			},
			size: {
				control: 'select',
				options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg']
			}
		}
	});
</script>

<Story name="Primary" args={{ variant: 'default' }}>Continue</Story>
<Story name="Secondary" args={{ variant: 'secondary' }}>Secondary action</Story>
<Story name="Outline" args={{ variant: 'outline' }}>Outline action</Story>
<Story name="Ghost" args={{ variant: 'ghost' }}>Quiet action</Story>
<Story name="Destructive" args={{ variant: 'destructive' }}>Remove</Story>
<Story name="Link" args={{ variant: 'link' }}>Learn more</Story>
<Story name="Disabled" args={{ disabled: true }}>Unavailable</Story>
