import { expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';

it.each([
	[
		'en',
		'Pack ready: 17 stickers',
		'2 packs ready: 31 stickers',
		'1 sticker is over 100 KB',
		'2 stickers are over 100 KB'
	],
	[
		'pt-BR',
		'Pacote pronto: 17 figurinhas',
		'2 pacotes prontos: 31 figurinhas',
		'1 figurinha ultrapassa 100 KB',
		'2 figurinhas ultrapassam 100 KB'
	],
	[
		'es',
		'Paquete listo: 17 stickers',
		'2 paquetes listos: 31 stickers',
		'1 sticker supera los 100 KB',
		'2 stickers superan los 100 KB'
	]
] as const)(
	'uses %s plural forms and parameters for feedback',
	(locale, singlePack, packs, singleWarning, warning) => {
		expect(m.export_success_toast({ count: 17, packs: 1 }, { locale })).toBe(singlePack);
		expect(m.export_success_toast({ count: 31, packs: 2 }, { locale })).toBe(packs);
		expect(m.export_over_budget_warning({ count: 1 }, { locale })).toContain(singleWarning);
		expect(m.export_over_budget_warning({ count: 2 }, { locale })).toContain(warning);
	}
);
