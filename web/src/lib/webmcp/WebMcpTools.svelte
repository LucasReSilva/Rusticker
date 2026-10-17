<script lang="ts">
	import { registerRustickerWebMcp, type WebMcpActions } from './registry';
	import { m } from '$lib/paraglide/messages';
	import { locale } from '$lib/i18n/locale.svelte';

	interface Props {
		actions: WebMcpActions;
	}

	let { actions }: Props = $props();

	$effect(() => {
		if (!locale.current) return;
		return registerRustickerWebMcp(document, actions, {
			openPickerTitle: m.webmcp_open_picker_title(),
			openPickerDescription: m.webmcp_open_picker_description(),
			statusTitle: m.webmcp_status_title(),
			statusDescription: m.webmcp_status_description()
		});
	});
</script>
