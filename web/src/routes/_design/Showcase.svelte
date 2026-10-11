<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { toast } from 'svelte-sonner';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge/index.js';
	import {
		Button,
		buttonVariants,
		type ButtonSize,
		type ButtonVariant
	} from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Slider } from '$lib/components/ui/slider/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { checkContrast, parseThemeTokens, type Theme } from '$lib/theme/contrast';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import themeCss from '../../app.css?raw';

	// Contrast ratios computed from the same source of truth as the unit test.
	const results = checkContrast(parseThemeTokens(themeCss));

	const buttonVariantList: ButtonVariant[] = [
		'default',
		'secondary',
		'outline',
		'ghost',
		'destructive',
		'link'
	];
	const buttonSizes: ButtonSize[] = ['xs', 'sm', 'default', 'lg'];
	const iconSizes: ButtonSize[] = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'];
	const badgeVariantList: BadgeVariant[] = [
		'default',
		'secondary',
		'outline',
		'ghost',
		'destructive',
		'link'
	];
	const radii = ['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl'];
	const shadows = [
		'shadow-xs',
		'shadow-sm',
		'shadow-md',
		'shadow-lg',
		'shadow-xl',
		'shadow-sticker'
	];
	const progressValues = [0, 33, 66, 100];

	const themes: Array<{ theme: Theme; label: string }> = [
		{ theme: 'light', label: m.design_theme_light() },
		{ theme: 'dark', label: m.design_theme_dark() }
	];
</script>

<svelte:head><title>{m.design_title()}</title></svelte:head>

<div data-design-showcase class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
	<header class="flex flex-col gap-2">
		<h1 class="font-display text-3xl font-bold">{m.design_title()}</h1>
		<p class="text-muted-foreground">{m.design_intro()}</p>
		<div class="flex flex-wrap items-center gap-2">
			<p class="text-sm text-muted-foreground">{m.design_overlays_note()}</p>
			<ThemeToggle />
		</div>
	</header>

	<Tooltip.Provider>
		<div class="grid gap-6 lg:grid-cols-2">
			{#each themes as { theme, label } (theme)}
				<section
					class="{theme} flex min-w-0 flex-col gap-8 rounded-xl border border-border bg-background p-4 text-foreground"
					data-panel={theme}
					aria-label={label}
				>
					<h2 class="font-display text-2xl font-semibold">{label}</h2>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_colors()}</h3>
						<ul class="grid gap-2 sm:grid-cols-2">
							{#each results.filter((r) => r.theme === theme) as pair (`${pair.fg}/${pair.bg}`)}
								<li
									class="flex flex-col gap-1 rounded-lg border border-border p-3"
									style="background: var(--{pair.bg}); color: var(--{pair.fg})"
								>
									<span class="text-lg font-semibold">{m.design_sample_specimen()}</span>
									<code class="font-mono text-xs">{pair.fg} / {pair.bg}</code>
									<span class="text-xs">
										{m.design_contrast_ratio({ ratio: pair.ratio.toFixed(2), min: pair.min })}
									</span>
								</li>
							{/each}
						</ul>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_typography()}</h3>
						<p class="font-display text-2xl font-bold">{m.design_sample_display()}</p>
						<p>{m.design_sample_body()}</p>
						<p class="text-sm text-muted-foreground">{m.design_sample_muted()}</p>
						<p class="font-mono text-sm">{m.design_sample_mono()}</p>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_radius()}</h3>
						<div class="flex flex-wrap gap-3">
							{#each radii as radius (radius)}
								<div class="flex flex-col items-center gap-1">
									<div class="size-12 border-2 border-primary bg-secondary {radius}"></div>
									<code class="font-mono text-xs">{radius}</code>
								</div>
							{/each}
						</div>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_shadows()}</h3>
						<div class="flex flex-wrap gap-4">
							{#each shadows as shadow (shadow)}
								<div class="flex flex-col items-center gap-2">
									<div class="size-16 rounded-lg bg-card {shadow}"></div>
									<code class="font-mono text-xs">{shadow}</code>
								</div>
							{/each}
						</div>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_transparency()}</h3>
						<div
							class="flex h-32 items-center justify-center rounded-lg bg-checkerboard"
							data-testid="checkerboard"
						>
							<div class="size-16 rounded-full bg-primary shadow-sticker ring-4 ring-card"></div>
						</div>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_buttons()}</h3>
						{#each buttonVariantList as variant (variant)}
							<div class="flex flex-wrap items-center gap-2">
								<code class="w-24 font-mono text-xs">{variant}</code>
								{#each buttonSizes as size (size)}
									<Button {variant} {size}>{m.design_sample_action()}</Button>
								{/each}
								<Button {variant} disabled>{m.design_sample_disabled()}</Button>
							</div>
						{/each}
						<div class="flex flex-wrap items-center gap-2">
							{#each iconSizes as size (size)}
								<Button variant="outline" {size} aria-label={m.design_sample_icon_label()}>
									<PlusIcon aria-hidden="true" />
								</Button>
							{/each}
						</div>
						<p class="text-sm text-muted-foreground">{m.design_sample_icon_note()}</p>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_cards()}</h3>
						<Card.Root>
							<Card.Header>
								<Card.Title>{m.design_sample_title()}</Card.Title>
								<Card.Description>{m.design_sample_description()}</Card.Description>
							</Card.Header>
							<Card.Content>{m.design_sample_card_body()}</Card.Content>
							<Card.Footer>
								<Button>{m.design_sample_action()}</Button>
							</Card.Footer>
						</Card.Root>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_badges()}</h3>
						<div class="flex flex-wrap gap-2">
							{#each badgeVariantList as variant (variant)}
								<Badge {variant}>{m.design_sample_badge()}</Badge>
							{/each}
						</div>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_slider()}</h3>
						<Slider
							type="single"
							value={40}
							max={100}
							step={1}
							thumbLabel={m.design_sample_slider_label()}
							data-testid="slider"
						/>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_tooltip()}</h3>
						<Tooltip.Root>
							<Tooltip.Trigger class={cn(buttonVariants({ variant: 'outline' }), 'self-start')}>
								{m.design_sample_tooltip_trigger()}
							</Tooltip.Trigger>
							<Tooltip.Content>{m.design_sample_tooltip()}</Tooltip.Content>
						</Tooltip.Root>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_dialog()}</h3>
						<Dialog.Root>
							<Dialog.Trigger
								class={cn(buttonVariants({ variant: 'outline' }), 'self-start')}
								data-testid="dialog-trigger"
							>
								{m.design_sample_dialog_trigger()}
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>{m.design_sample_dialog_title()}</Dialog.Title>
									<Dialog.Description>{m.design_sample_dialog_body()}</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer showCloseButton>
									<Button>{m.design_sample_action()}</Button>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_menu()}</h3>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger
								class={cn(buttonVariants({ variant: 'outline' }), 'self-start')}
								data-testid="menu-trigger"
							>
								{m.design_sample_menu_trigger()}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="w-auto">
								<DropdownMenu.Item>{m.design_sample_menu_item_one()}</DropdownMenu.Item>
								<DropdownMenu.Item>{m.design_sample_menu_item_two()}</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item variant="destructive">
									{m.design_sample_menu_item_three()}
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_toasts()}</h3>
						<div class="flex flex-wrap gap-2">
							<Button
								variant="outline"
								onclick={() =>
									toast.success(m.design_sample_toast_success(), {
										description: m.design_sample_toast_description()
									})}
							>
								{m.design_sample_toast_trigger()}
							</Button>
							<Button variant="outline" onclick={() => toast.error(m.design_sample_toast_error())}>
								{m.design_sample_toast_error_trigger()}
							</Button>
						</div>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_progress()}</h3>
						{#each progressValues as value (value)}
							<Progress {value} aria-label={m.design_sample_progress_label()} />
						{/each}
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_skeleton()}</h3>
						<div class="flex items-center gap-3" role="status" aria-label={m.a11y_loading()}>
							<Skeleton class="size-12 rounded-full" />
							<div class="flex flex-1 flex-col gap-2">
								<Skeleton class="h-4 w-3/4" />
								<Skeleton class="h-4 w-1/2" />
							</div>
						</div>
					</section>

					<section class="flex flex-col gap-3">
						<h3 class="text-lg font-semibold">{m.design_section_separator()}</h3>
						<p class="text-sm">{m.design_sample_body()}</p>
						<Separator />
						<div class="flex h-6 items-center gap-3 text-sm">
							<span>{m.design_sample_action()}</span>
							<Separator orientation="vertical" />
							<span>{m.design_sample_badge()}</span>
						</div>
					</section>
				</section>
			{/each}
		</div>
	</Tooltip.Provider>
</div>
