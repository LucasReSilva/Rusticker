import type { Preview } from '@storybook/sveltekit';
import ThemeDecorator from '../src/lib/storybook/ThemeDecorator.svelte';
import '../src/app.css';

const preview: Preview = {
	globalTypes: {
		theme: {
			description: 'Preview theme',
			toolbar: {
				title: 'Theme',
				icon: 'circlehollow',
				items: [
					{ value: 'light', title: 'Light' },
					{ value: 'dark', title: 'Dark' }
				],
				dynamicTitle: true
			}
		}
	},
	initialGlobals: {
		theme: 'light'
	},
	decorators: [
		(_story, context) => ({
			Component: ThemeDecorator,
			props: { theme: context.globals.theme === 'dark' ? 'dark' : 'light' }
		})
	],
	parameters: {
		actions: { argTypesRegex: '^on[A-Z].*' },
		controls: { expanded: true },
		layout: 'padded'
	}
};

export default preview;
