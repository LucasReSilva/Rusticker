import { expect, test, type Page } from '@playwright/test';
import { savedLocale } from '../web-scaffold/fixtures';

test.use({ locale: 'pt-BR', storageState: savedLocale('pt-BR') });

/** A locally drawn PNG with six separated stickers and a slightly different green. */
async function syntheticPng(page: Page): Promise<Buffer> {
	await page.locator('input[type=file]').waitFor({ state: 'attached' });
	const dataUrl = await page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 600;
		canvas.height = 400;
		const context = canvas.getContext('2d')!;
		context.fillStyle = 'rgb(10 180 70)';
		context.fillRect(0, 0, 600, 400);
		for (let i = 0; i < 6; i++) {
			context.fillStyle = i % 2 ? 'rgb(230 30 30)' : 'rgb(30 30 230)';
			context.fillRect(40 + (i % 3) * 200, 40 + Math.floor(i / 3) * 200, 80, 80);
		}
		return canvas.toDataURL('image/png');
	});
	return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function load(page: Page): Promise<void> {
	await page.goto('');
	await page.locator('input[type=file]').setInputFiles({
		name: 'synthetic.png',
		mimeType: 'image/png',
		buffer: await syntheticPng(page)
	});
	await expect(page.locator('[data-sticker-card]')).toHaveCount(6);
	await expect(page.locator('[data-detection-box]')).toHaveCount(6);
	await expect(page.locator('[data-detected-count]')).toHaveText('6 figurinhas selecionadas');
}

async function horizontalOverflowDiagnostics(page: Page): Promise<string> {
	return JSON.stringify(
		await page.evaluate(() => {
			const viewport = window.innerWidth;
			const elements = [...document.body.querySelectorAll<HTMLElement>('*')]
				.map((element) => {
					const rect = element.getBoundingClientRect();
					return {
						tag: element.tagName.toLowerCase(),
						id: element.id,
						className: typeof element.className === 'string' ? element.className : '',
						right: Math.round(rect.right * 100) / 100,
						left: Math.round(rect.left * 100) / 100,
						width: Math.round(rect.width * 100) / 100,
						scrollWidth: element.scrollWidth,
						clientWidth: element.clientWidth,
						overflowX: getComputedStyle(element).overflowX,
						position: getComputedStyle(element).position,
						parents: Array.from({ length: 4 }, (_, index) => {
							let parent = element.parentElement;
							for (let depth = 0; depth < index && parent; depth++) {
								parent = parent.parentElement;
							}
							if (!parent) return null;
							const parentRect = parent.getBoundingClientRect();
							return {
								tag: parent.tagName.toLowerCase(),
								className: typeof parent.className === 'string' ? parent.className : '',
								left: Math.round(parentRect.left * 100) / 100,
								right: Math.round(parentRect.right * 100) / 100,
								width: Math.round(parentRect.width * 100) / 100,
								scrollWidth: parent.scrollWidth,
								clientWidth: parent.clientWidth,
								overflowX: getComputedStyle(parent).overflowX
							};
						})
					};
				})
				.filter((element) => element.right > viewport + 1)
				.sort((left, right) => right.right - left.right)
				.slice(0, 20);
			return {
				viewport,
				documentWidth: document.documentElement.scrollWidth,
				bodyWidth: document.body.scrollWidth,
				elements
			};
		})
	);
}

test('sticker previews fade in without layout shifts and skip animation for reduced motion', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await load(page);
	const preview = page.locator('[data-sticker-preview]').first();
	const animationName = await preview.evaluate(
		(element) => getComputedStyle(element).animationName
	);
	expect(animationName).not.toBe('none');
	const initialBounds = await preview.boundingBox();
	await page.waitForTimeout(350);
	const finalBounds = await preview.boundingBox();
	expect(finalBounds?.width).toBe(initialBounds?.width);
	expect(finalBounds?.height).toBe(initialBounds?.height);

	await page.emulateMedia({ reducedMotion: 'reduce' });
	await load(page);
	const reducedPreview = page.locator('[data-sticker-preview]').first();
	expect(await reducedPreview.evaluate((element) => getComputedStyle(element).animationName)).toBe(
		'none'
	);
	expect(await reducedPreview.boundingBox()).not.toBeNull();
});

test('zoomed source inspection and crop adjustment work at mobile width', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await load(page);
	const sourceInspector = page.locator('[data-source-inspector]');
	await page.getByRole('button', { name: 'Ampliar' }).click();
	await expect(sourceInspector).toHaveAttribute('data-zoom', '2');
	const initialScroll = await sourceInspector.evaluate((element) => element.scrollLeft);
	const sourceArea = await sourceInspector.boundingBox();
	expect(sourceArea).not.toBeNull();
	await page.mouse.move(
		sourceArea!.x + sourceArea!.width / 2,
		sourceArea!.y + sourceArea!.height / 2
	);
	await page.mouse.down();
	await page.mouse.move(
		sourceArea!.x + sourceArea!.width / 2 - 24,
		sourceArea!.y + sourceArea!.height / 2
	);
	await page.mouse.up();
	expect(await sourceInspector.evaluate((element) => element.scrollLeft)).toBeGreaterThan(
		initialScroll
	);
	await expect(page.locator('[data-detection-box]').first()).toHaveAttribute('x', '40');
	await page.getByRole('button', { name: /Avan/ }).click();
	await page
		.locator('[data-sticker-card]')
		.first()
		.getByRole('button', { name: 'Ajustar recorte' })
		.click();
	const dialog = page.getByRole('dialog');
	const cropInspector = dialog.locator('[data-crop-inspector]');
	await expect(
		dialog.getByRole('img', { name: 'Imagem original com recorte ajustável' })
	).toBeVisible();
	await dialog.getByRole('button', { name: 'Ampliar' }).click();
	await expect(cropInspector).toHaveAttribute('data-zoom', '2');
	const box = dialog.locator('[data-crop-box]');
	await expect(box).toHaveAttribute('data-x', '40');
	await dialog.getByRole('button', { name: 'Mover recorte' }).focus();
	await page.keyboard.press('ArrowRight');
	await expect(box).toHaveAttribute('data-x', '41');
	const move = dialog.getByRole('button', { name: 'Mover recorte' });
	await move.scrollIntoViewIfNeeded();
	const moveArea = await move.boundingBox();
	expect(moveArea).not.toBeNull();
	await page.mouse.move(moveArea!.x + moveArea!.width / 2, moveArea!.y + moveArea!.height / 2);
	await page.mouse.down();
	await page.mouse.move(moveArea!.x + moveArea!.width / 2 + 20, moveArea!.y + moveArea!.height / 2);
	await page.mouse.up();
	await expect.poll(async () => Number(await box.getAttribute('data-x'))).toBeGreaterThan(41);
	const finalX = await box.getAttribute('data-x');
	await dialog.getByRole('button', { name: 'Aplicar recorte' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.locator('[data-detection-box]').first()).toHaveAttribute('x', finalX!);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
	expect(overflow, await horizontalOverflowDiagnostics(page)).toBe(false);
});

test('manual source candidates stay synchronized through bounds edits, undo, and export', async ({
	page
}) => {
	await load(page);
	const inspector = page.locator('[data-source-inspector]');
	const overlay = inspector.locator('svg');
	await page.getByRole('button', { name: 'Adicionar candidata a figurinha' }).click();
	await overlay.scrollIntoViewIfNeeded();
	const area = await overlay.boundingBox();
	expect(area).not.toBeNull();
	await page.mouse.move(area!.x + area!.width * 0.7, area!.y + area!.height * 0.05);
	await page.mouse.down();
	await page.mouse.move(area!.x + area!.width * 0.9, area!.y + area!.height * 0.35);
	await expect(overlay.locator('[data-draft-box]')).toBeVisible();
	await page.mouse.up();
	const cards = page.locator('[data-sticker-card]');
	await expect(cards).toHaveCount(7);
	const candidateBox = overlay.locator('[data-candidate-box="6"]');
	const beforeX = Number(await candidateBox.locator('[data-detection-box]').getAttribute('x'));
	await candidateBox.focus();
	await page.keyboard.press('ArrowRight');
	await expect
		.poll(async () => Number(await candidateBox.locator('[data-detection-box]').getAttribute('x')))
		.toBeGreaterThan(beforeX);
	await cards.last().getByRole('button', { name: 'Remover figurinha 7' }).click();
	await page.getByRole('button', { name: 'Remover', exact: true }).click();
	await expect(cards).toHaveCount(6);
	await page
		.getByRole('button', { name: 'Desfazer a última edição do espaço de trabalho' })
		.click();
	await expect(cards).toHaveCount(7);
	await expect(overlay.locator('[data-detection-box]')).toHaveCount(7);
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Baixar pacote (.zip)' }).click();
	expect((await download).suggestedFilename()).toBe('rusticker-pack-1.zip');
});

test('click chooser, keyboard eyedropper and debounced tolerance use the real worker locally', async ({
	page
}) => {
	const requests: string[] = [];
	page.on('request', (request) => requests.push(request.url()));
	await page.goto('');
	const buffer = await syntheticPng(page);
	const chooser = page.waitForEvent('filechooser');
	await page.locator('[data-tool-dropzone]').click();
	await (await chooser).setFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer });
	await expect(page.locator('[data-sticker-card]')).toHaveCount(6);
	const boxes = page.locator('[data-detection-box]');
	await expect(boxes).toHaveCount(6);
	await expect(boxes.first()).toHaveAttribute('x', '40');
	await expect(boxes.first()).toHaveAttribute('y', '40');
	await expect(
		page.getByRole('button', { name: 'Escolher cor de fundo', exact: true })
	).toHaveCount(0);
	await page.getByRole('button', { name: 'Avançado', exact: true }).click();
	await page.getByRole('button', { name: 'Escolher cor de fundo', exact: true }).click();
	const picker = page.getByRole('application');
	await expect(picker).toBeFocused();
	await picker.press('ArrowRight');
	await picker.press('Enter');
	await expect(page.locator('[data-background-color]')).toHaveText('#0AB446');
	await expect(page.locator('[aria-busy=true]')).toHaveCount(0);
	const ids = await page
		.locator('[data-sticker-card]')
		.evaluateAll((cards) => cards.map((card) => card.getAttribute('data-sticker-card')));
	const slider = page.getByRole('slider');
	await slider.evaluate((element) => {
		for (let i = 0; i < 3; i++)
			element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
	});
	await expect(slider).toHaveAttribute('aria-valuenow', '53');
	await expect(page.locator('[data-detected-count]')).toHaveText('Processando imagem');
	const progress = page.getByRole('progressbar', { name: 'Processando imagem' });
	await expect(progress).toHaveAttribute('data-state', 'indeterminate');
	await expect(progress).not.toHaveAttribute('aria-valuenow');
	const indicator = progress.locator('[data-slot=progress-indicator]');
	expect(await indicator.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
	expect(
		await indicator.evaluate((element) => {
			const bar = element.parentElement!.getBoundingClientRect();
			const fill = element.getBoundingClientRect();
			return fill.width > 0 && fill.height > 0 && fill.x < bar.right && fill.right > bar.x;
		})
	).toBe(true);
	expect(
		await page
			.locator('[data-sticker-card]')
			.evaluateAll((cards) => cards.map((card) => card.getAttribute('data-sticker-card')))
	).toEqual(ids);
	await expect
		.poll(() => page.locator('[data-sticker-card]').first().getAttribute('data-sticker-card'))
		.not.toBe(ids[0]);
	await expect(page.locator('[data-sticker-card]')).toHaveCount(6);
	const finalIds = await page
		.locator('[data-sticker-card]')
		.evaluateAll((cards) => cards.map((card) => card.getAttribute('data-sticker-card')));
	await page.waitForTimeout(650);
	expect(
		await page
			.locator('[data-sticker-card]')
			.evaluateAll((cards) => cards.map((card) => card.getAttribute('data-sticker-card')))
	).toEqual(finalIds);
	const origin = new URL(page.url()).origin;
	expect(requests.filter((url) => new URL(url).origin !== origin)).toEqual([]);
});

test('drop and paste read synthetic image files without uploading them', async ({ page }) => {
	await page.goto('');
	const data = (await syntheticPng(page)).toString('base64');
	await page.evaluate((data) => {
		const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
		const transfer = new DataTransfer();
		transfer.items.add(new File([bytes], 'drop.png', { type: 'image/png' }));
		document
			.querySelector('[data-tool-dropzone]')!
			.dispatchEvent(
				new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer })
			);
	}, data);
	await expect(page.locator('[data-sticker-card]')).toHaveCount(6);
	const oldId = await page.locator('[data-sticker-card]').first().getAttribute('data-sticker-card');
	await page.evaluate((data) => {
		const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
		const transfer = new DataTransfer();
		transfer.items.add(new File([bytes], 'paste.png', { type: 'image/png' }));
		document.body.dispatchEvent(
			new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer })
		);
	}, data);
	await expect
		.poll(() => page.locator('[data-sticker-card]').first().getAttribute('data-sticker-card'))
		.not.toBe(oldId);
	await expect(page.locator('[data-detection-box]')).toHaveCount(6);
});

test('keyboard curation preserves focus, tray choice and the source across a language switch', async ({
	page
}) => {
	await load(page);
	const cards = page.locator('[data-sticker-card]');
	await cards.first().focus();
	await page.keyboard.press('ArrowRight');
	await expect(cards.nth(1)).toBeFocused();
	await page.keyboard.press('ArrowDown');
	await expect(cards.nth(5)).toBeFocused();
	await page.keyboard.press('Home');
	await expect(cards.first()).toBeFocused();
	await page.keyboard.press('End');
	await expect(cards.last()).toBeFocused();
	await expect(page.locator('[data-sticker-card][tabindex="0"]')).toHaveCount(1);
	await page.keyboard.press('Delete');
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
	await expect(cards).toHaveCount(6);
	await expect(cards.last().locator('[data-remove-action]')).toBeFocused();
	await page.keyboard.press('Delete');
	await page.getByRole('button', { name: 'Remover', exact: true }).click();
	await expect(cards).toHaveCount(5);
	await expect(cards.last()).toBeFocused();
	await cards.nth(2).getByRole('button', { name: 'Usar como ícone do pacote' }).click();
	await expect(
		cards.nth(2).getByRole('button', { name: 'Usar como ícone do pacote' })
	).toHaveAttribute('aria-pressed', 'true');
	const source = await page.getByAltText('Folha original de figurinhas').getAttribute('src');
	const ids = await cards.evaluateAll((elements) =>
		elements.map((element) => element.getAttribute('data-sticker-card'))
	);
	const documents: string[] = [];
	page.on('request', (request) => {
		if (request.resourceType() === 'document') documents.push(request.url());
	});
	await page.getByTestId('language-switcher').click();
	await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(cards).toHaveCount(5);
	expect(
		await cards.evaluateAll((elements) =>
			elements.map((element) => element.getAttribute('data-sticker-card'))
		)
	).toEqual(ids);
	await expect(page.getByAltText('Original sticker sheet')).toHaveAttribute('src', source!);
	await expect(cards.nth(2).getByRole('button', { name: 'Use as pack icon' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.locator('[data-detected-count]')).toHaveText('5 stickers kept');
	expect(documents).toEqual([]);
});

test('the dark editor fits a 375px viewport with reduced motion', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
	await load(page);
	await expect(page.locator('html')).toHaveClass(/dark/);
	expect(
		await page.locator('[data-slot="export"]').evaluate((region) => {
			const firstSticker = document.querySelector('[data-sticker-card]');
			return Boolean(
				firstSticker &&
				region.compareDocumentPosition(firstSticker) & Node.DOCUMENT_POSITION_FOLLOWING
			);
		})
	).toBe(true);
	const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
	expect(fits, await horizontalOverflowDiagnostics(page)).toBe(true);
});
