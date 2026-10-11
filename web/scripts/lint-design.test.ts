import { describe, expect, it } from 'vitest';
import { lintSource } from './lint-design';

const feature = 'src/lib/components/Feature.svelte';
const kit = 'src/lib/components/ui/button/button.svelte';

const messages = (file: string, text: string) => lintSource(file, text).map((f) => f.message);

describe('lint-design', () => {
	it('accepts a clean component', () => {
		const clean = `<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<!-- logical utilities and tokens only -->
<a href="#main-content" class="ms-2 pe-4 start-0 text-start bg-primary text-primary-foreground rounded-lg">
	{m.app_name()}
</a>
<div class="data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 bg-checkerboard"></div>
<p style="color: var(--muted-foreground)">x</p>
`;
		expect(lintSource(feature, clean)).toEqual([]);
	});

	it('rejects a hex color in a class', () => {
		const found = lintSource(feature, '<div class="text-[#ff0000]"></div>');
		expect(found).toHaveLength(1);
		expect(found[0]).toMatchObject({ file: feature, line: 1 });
		expect(found[0].message).toContain('#ff0000');
	});

	it('rejects a hex color in a style attribute', () => {
		expect(messages(feature, '<div style="color: #abc"></div>')).toEqual([
			expect.stringContaining('raw color "#abc"')
		]);
	});

	it('rejects an rgb() style', () => {
		expect(messages(feature, '<div style="background: rgb(0 0 0 / 50%)"></div>')).toEqual([
			expect.stringContaining('raw color "rgb(')
		]);
	});

	it('rejects an arbitrary bg-[#…] color', () => {
		expect(messages(feature, `const c = 'bg-[#123456]';`)).toEqual([
			expect.stringContaining('#123456')
		]);
	});

	it('rejects hex colors in a <style> block', () => {
		const found = lintSource(feature, '<style>\n\t.x { color: #fff; }\n</style>');
		expect(found.map((f) => f.line)).toEqual([2]);
	});

	it('does not treat a fragment link as a color', () => {
		expect(lintSource(feature, '<a href="#add">x</a>')).toEqual([]);
	});

	it.each([
		['ml-2', 'ms-'],
		['pr-4', 'pe-'],
		['left-0', 'start-'],
		['-right-1', '-end-'],
		['hover:pl-3', 'ps-'],
		['border-l', 'border-s'],
		['rounded-tl-lg', 'rounded-ss-']
	])('rejects the physical utility %s and suggests %s', (utility, suggestion) => {
		const value = utility === 'border-l' ? 'border-l-2' : utility;
		const found = messages(feature, `<div class="flex ${value}"></div>`);
		expect(found).toHaveLength(1);
		expect(found[0]).toContain(`"${suggestion}`);
	});

	it('rejects text-right and suggests text-end', () => {
		expect(messages(feature, '<p class="text-right">x</p>')).toEqual([
			expect.stringContaining('text-end')
		]);
	});

	it('allows slide animations scoped to data-[side=…]', () => {
		expect(
			lintSource(
				kit,
				`<div class="data-[side=left]:slide-in-from-right-2 data-[side=right]:-left-1"></div>`
			)
		).toEqual([]);
	});

	it('rejects a magic pixel value outside ui/', () => {
		expect(messages(feature, '<div class="w-[37px]"></div>')).toEqual([
			expect.stringContaining('[37px]')
		]);
	});

	it('allows the kit its own pixel values', () => {
		expect(lintSource(kit, '<div class="focus-visible:ring-[3px]"></div>')).toEqual([]);
	});

	it('skips a line with a reasoned lint-design-ignore', () => {
		expect(
			lintSource(feature, '<div class="ml-2"></div> <!-- lint-design-ignore: mirrors a photo -->')
		).toEqual([]);
	});

	it('requires a reason for lint-design-ignore', () => {
		expect(messages(feature, '<div class="ml-2"></div> <!-- lint-design-ignore -->')).toEqual([
			expect.stringContaining('needs a reason')
		]);
	});

	it('reports the line number of each finding', () => {
		const found = lintSource(
			feature,
			'const a = 1;\n<div class="mr-1"></div>\n<p class="pl-2"></p>'
		);
		expect(found.map((f) => f.line)).toEqual([2, 3]);
	});
});
