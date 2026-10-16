<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Badge from './badge.svelte';

	const { Story } = defineMeta({
		title: 'Design System/Badge',
		component: Badge,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: 'Compact status and supporting labels with theme-aware variants.'
				}
			}
		},
		argTypes: {
			variant: {
				control: 'select',
				options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link']
			}
		}
	});
</script>

<Story name="Default" args={{ variant: 'default' }}>Ready</Story>
<Story name="Secondary" args={{ variant: 'secondary' }}>WhatsApp pack</Story>
<Story name="Destructive" args={{ variant: 'destructive' }}>Needs attention</Story>
<Story name="Outline" args={{ variant: 'outline' }}>Draft</Story>
<Story name="Ghost" args={{ variant: 'ghost' }}>Optional</Story>
<Story name="Link" args={{ variant: 'link' }}>Details</Story>
