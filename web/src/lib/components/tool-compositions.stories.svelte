<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DropZone from './DropZone.svelte';
	import Controls from './Controls.svelte';
	import { m } from '$lib/paraglide/messages';

	const { Story } = defineMeta({
		title: 'Rusticker/Tool compositions',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component:
						'Feature-level compositions built from the app controls. Use the theme toolbar to compare light and dark tokens; visible copy comes from the active Paraglide catalog.'

				}
			}
		}
	});

	const noop = () => {};
</script>

<Story name="Empty tool — upload">
	<div class="mx-auto flex max-w-2xl flex-col gap-4">
		<h1 class="font-display text-3xl font-bold">{m.app_tool_heading()}</h1>
		<DropZone onFiles={noop} onReject={noop} />
	</div>
</Story>

<Story name="Processing — advanced controls">
	<div class="mx-auto flex max-w-xl flex-col gap-4">
		<h2 class="font-display text-2xl font-bold">{m.tool_processing_mode_advanced()}</h2>
		<Controls
			tolerance={42}
			background={{ r: 0, g: 255, b: 0 }}
			busy={true}
			hasImage={true}
			mode="advanced"
			onModeChange={noop}
			onToleranceChange={noop}
		/>
	</div>
</Story>
