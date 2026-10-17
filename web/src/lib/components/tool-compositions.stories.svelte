<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DropZone from './DropZone.svelte';
	import Controls from './Controls.svelte';
	import StickerCard from './StickerCard.svelte';
	import { Button } from './ui/button';
	import * as Card from './ui/card';
	import type { Sticker } from '$lib/detection';
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
	const stickerPixels = new ImageData(512, 512);
	for (let y = 96; y < 416; y += 1) {
		for (let x = 96; x < 416; x += 1) {
			const offset = (y * 512 + x) * 4;
			stickerPixels.data[offset] = 235;
			stickerPixels.data[offset + 1] = 112;
			stickerPixels.data[offset + 2] = 42;
			stickerPixels.data[offset + 3] = 255;
		}
	}
	const sampleSticker: Sticker = {
		id: 'storybook-sample',
		index: 0,
		bbox: { x: 0, y: 0, width: 512, height: 512 },
		pixels: stickerPixels
	};
</script>

<Story name="Public page before">
	<div class="mx-auto flex max-w-4xl flex-col gap-4">
		<h1 class="font-display text-3xl font-bold">{m.page_about_heading()}</h1>
		<p>{m.page_about_intro()}</p>
		<h2 class="text-xl font-semibold">{m.page_about_privacy_heading()}</h2>
		<p>{m.page_about_privacy_body()}</p>
	</div>
</Story>

<Story name="Public page after">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<header class="max-w-2xl border-s-2 border-primary ps-4 sm:ps-6">
			<h1 class="font-display text-3xl font-bold tracking-tight sm:text-4xl">
				{m.page_about_heading()}
			</h1>
			<p class="mt-3 text-lg text-muted-foreground">{m.page_about_intro()}</p>
		</header>
		<Card.Root class="max-w-2xl">
			<Card.Header>
				<Card.Title>{m.page_about_privacy_heading()}</Card.Title>
				<Card.Description>{m.page_about_privacy_body()}</Card.Description>
			</Card.Header>
		</Card.Root>
	</div>
</Story>

<Story name="Sticker actions before">
	<div class="mx-auto flex max-w-sm flex-col gap-3 rounded-xl border border-border bg-card p-3">
		<div class="aspect-square rounded-md bg-checkerboard" aria-hidden="true"></div>
		<div class="flex flex-wrap justify-end gap-2">
			<Button variant="outline" size="sm">{m.tool_move_earlier()}</Button>
			<Button variant="outline" size="sm">{m.tool_move_later()}</Button>
			<Button variant="ghost" size="sm">{m.tool_tray_icon_set()}</Button>
			<Button variant="ghost" size="sm">{m.tool_remove_label({ position: '1' })}</Button>
		</div>
	</div>
</Story>

<Story name="Empty tool — upload">
	<div class="mx-auto flex max-w-2xl flex-col gap-4">
		<h1 class="font-display text-3xl font-bold">{m.app_tool_heading()}</h1>
		<DropZone onFiles={noop} onReject={noop} />
	</div>
</Story>

<Story name="Sticker actions after">
	<div class="mx-auto max-w-sm">
		<StickerCard
			sticker={sampleSticker}
			position={1}
			total={1}
			isTrayIcon={false}
			canMoveEarlier={false}
			canMoveLater={false}
			active={true}
			onRemoveRequest={noop}
			onSetTrayIcon={noop}
			onMoveEarlier={noop}
			onMoveLater={noop}
			onFocus={noop}
			splitPreview={null}
			splitBusy={false}
			noSplitProposal={false}
			undoable={false}
			onSplitRequest={noop}
			onSplitAccept={noop}
			onSplitDiscard={noop}
			onSplitUndo={noop}
		/>
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
