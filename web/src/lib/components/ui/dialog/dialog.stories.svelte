<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Dialog from './index.js';
	import { Button } from '../button/index.js';
	import { DialogTitle, DialogDescription } from './index.js';

	const { Story } = defineMeta({
		title: 'Design System/Dialog',
		component: Dialog.Root,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: 'Modal dialog primitives with focus management and explicit actions.'
				}
			}
		}
	});
</script>

<Story name="Interactive Dialog" asChild>
	<Dialog.Root>
		<Dialog.Trigger>
			{#snippet child({ props })}<Button {...props}>Open dialog</Button>{/snippet}
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header>
				<DialogTitle>Export sticker pack</DialogTitle>
				<DialogDescription>Review your pack before saving it to this device.</DialogDescription>
			</Dialog.Header>
			<Dialog.Footer>
				<Dialog.Close>
					{#snippet child({ props })}<Button variant="outline" {...props}>Cancel</Button>{/snippet}
				</Dialog.Close>
				<Dialog.Close>
					{#snippet child({ props })}<Button {...props}>Save pack</Button>{/snippet}
				</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</Story>
