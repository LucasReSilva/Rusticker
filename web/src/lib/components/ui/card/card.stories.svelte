<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Card from './index.js';

	const { Story } = defineMeta({
		title: 'Design System/Card',
		component: Card.Root,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: 'Composable surface primitives for grouping related content and actions.'
				}
			}
		}
	});
</script>

<Story name="Content Card" asChild>
	<Card.Root class="max-w-sm">
		<Card.Header class="border-b">
			<Card.Title>Sticker pack</Card.Title>
			<Card.Description>Review the detected stickers before exporting.</Card.Description>
		</Card.Header>
		<Card.Content class="py-4">
			<p class="text-sm text-muted-foreground">12 stickers are ready to curate.</p>
		</Card.Content>
		<Card.Footer class="justify-end">
			<span class="text-sm font-medium text-secondary-foreground">Ready to export</span>
		</Card.Footer>
	</Card.Root>
</Story>
