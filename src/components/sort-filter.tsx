'use client';

import { useState } from 'react';
import { m } from 'motion/react';
import { ArrowDownAZ, Check, ChevronDown, Circle, List, RotateCcw, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { AQI_BANDS } from '@/lib/aqi';
import { fill, plural } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DEFAULT_FILTER, isFiltered, type ListFilter, type SortKey } from './list-filter';
import { useDictionary, useLocale } from './locale-provider';

/**
 * Best and worst borrow the face and fill of the top and bottom AQI bands, matching the solid band buttons above;
 * the neutral orders use the app's primary. White text passes AA on all three (5.0, 5.8, 11.6).
 */
const SORT_OPTIONS: { value: SortKey; icon: LucideIcon; fill: string }[] = [
	{ value: 'default', icon: List, fill: 'var(--primary)' },
	{ value: 'best', icon: AQI_BANDS.at(-1)!.icon, fill: AQI_BANDS.at(-1)!.fill },
	{ value: 'worst', icon: AQI_BANDS[0].icon, fill: AQI_BANDS[0].fill },
	{ value: 'name', icon: ArrowDownAZ, fill: 'var(--primary)' }
];

/** Stiffer than the navbar's spring: the hop is short, and the thumb must land as the label turns white. */
const THUMB = { type: 'spring', stiffness: 700, damping: 48, mass: 0.6 } as const;

interface Props {
	value: ListFilter;
	onApply: (next: ListFilter) => void;
	/** Locations currently in each band, by AQI_BANDS index. */
	bandCounts: number[];
	/** Locations without data yet: always shown, whatever the filter. */
	pendingCount: number;
}

/**
 * The AQI scale is the control: each band is a toggle that shows how many locations sit in it now.
 * Edits are a draft until the apply button, which states the result ("Show N locations") before it is applied.
 */
export function SortFilter({ value, onApply, bandCounts, pendingCount }: Props) {
	const t = useDictionary();
	const locale = useLocale();
	const [open, setOpen] = useState(false);
	const [bands, setBands] = useState<number[]>(value.bands);
	const [sort, setSort] = useState<SortKey>(value.sort);

	function handleOpenChange(next: boolean) {
		if (next) {
			setBands(value.bands);
			setSort(value.sort);
		}
		setOpen(next);
	}

	function toggle(index: number) {
		setBands((current) => (current.includes(index) ? current.filter((i) => i !== index) : [...current, index].sort((a, b) => a - b)));
	}

	const active = SORT_OPTIONS.find((option) => option.value === sort) ?? SORT_OPTIONS[0];
	const matching = pendingCount + bands.reduce((sum, i) => sum + (bandCounts[i] ?? 0), 0);
	const nothingPicked = bands.length === 0;
	const filtered = isFiltered(value);

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="lg"
					// Icon-only below lg, like the refresh button beside it, so the region and both actions share one row on phones.
					className={cn(
						'h-11 w-11 gap-2 rounded-full border-input bg-card px-0 text-muted-foreground lg:w-auto lg:px-4',
						filtered && 'border-primary/50 text-primary hover:text-primary aria-expanded:text-primary'
					)}
					title={t.filter.trigger}
				>
					<span className="relative">
						<SlidersHorizontal className="size-4" aria-hidden="true" />
						{filtered && <span aria-hidden="true" className="absolute -top-1 -right-1 size-2 rounded-full bg-primary ring-2 ring-card" />}
					</span>
					<span className="sr-only lg:not-sr-only">{t.filter.trigger}</span>
					{filtered && <span className="sr-only">{t.filter.active}</span>}
					<ChevronDown className="hidden size-4 text-muted-foreground lg:block" aria-hidden="true" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				collisionPadding={16}
				className="w-[min(420px,calc(100vw-32px))] gap-0 overflow-hidden rounded-3xl p-0"
			>
				<div className="grid gap-5 p-5">
					<div>
						<p className="font-heading text-lg leading-snug font-semibold">{t.filter.title}</p>
						<p className="mt-1 text-sm text-muted-foreground">{t.filter.hint}</p>
					</div>

					<div role="group" aria-label={t.filter.bandsLabel} className="flex gap-1">
						{AQI_BANDS.map((band, i) => {
							const on = bands.includes(i);
							const max = (AQI_BANDS[i + 1]?.min ?? 101) - 1;
							const Icon = on ? Check : Circle;
							return (
								<button
									key={band.min}
									type="button"
									aria-pressed={on}
									aria-label={fill(t.filter.bandOption, {
										band: t.aqi.bands[band.key],
										min: String(band.min),
										max: String(max),
										count: plural(t.common.locations, bandCounts[i] ?? 0, locale)
									})}
									onClick={() => toggle(i)}
									className={cn(
										'grid min-h-24 flex-1 content-between gap-2 rounded-md border-2 p-2 text-left text-xs transition-[background-color,color,border-color] outline-none first:rounded-l-2xl last:rounded-r-2xl focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-2.5',
										!on && 'border-dashed bg-card'
									)}
									style={on ? { background: band.fill, color: band.onFill, borderColor: band.fill } : { borderColor: band.fill, color: band.ink }}
								>
									<span className="flex items-start justify-between gap-1">
										<Icon className="size-4 shrink-0" aria-hidden="true" />
										<span className="text-base leading-none font-semibold tabular-nums">{bandCounts[i] ?? 0}</span>
									</span>
									<span className="grid gap-0.5">
										<span className="leading-tight font-semibold">{t.aqi.bands[band.key]}</span>
										<span className="text-[11px] whitespace-nowrap tabular-nums opacity-85 sm:text-xs">
											{band.min}–{max}
										</span>
									</span>
								</button>
							);
						})}
					</div>

					<div className="grid gap-2">
						<p id="sort-label" className="text-sm font-semibold">
							{t.filter.sort}
						</p>
						<ToggleGroup
							type="single"
							value={sort}
							onValueChange={(next) => next && setSort(next as SortKey)}
							aria-labelledby="sort-label"
							aria-describedby="sort-description"
							spacing={0}
							className="relative w-full rounded-full bg-muted p-1"
						>
							{/* One thumb for the whole track: it slides and takes the pick's color in the same motion. */}
							<m.span
								aria-hidden="true"
								className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-full shadow-sm"
								initial={false}
								animate={{ x: `${SORT_OPTIONS.findIndex((option) => option.value === sort) * 100}%`, backgroundColor: active.fill }}
								transition={{ x: THUMB, backgroundColor: { duration: 0.12 } }}
							/>
							{SORT_OPTIONS.map(({ value: key, icon: Icon }) => (
								<ToggleGroupItem
									key={key}
									value={key}
									// The toggle's own on-state paints an opaque muted fill over the thumb; clear it, and recolor without delay.
									className="relative h-9 flex-1 gap-1.5 rounded-full! text-muted-foreground transition-none hover:bg-transparent hover:text-foreground data-[state=on]:bg-transparent data-[state=on]:font-semibold data-[state=on]:text-white"
								>
									<Icon className="max-sm:hidden" aria-hidden="true" />
									{t.filter.sorts[key].label}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
						<p id="sort-description" className="text-xs text-muted-foreground">
							{t.filter.sorts[active.value].description}
						</p>
					</div>

					{pendingCount > 0 && (
						<p className="text-xs text-muted-foreground">{plural(t.filter.pending, pendingCount, locale)}</p>
					)}
				</div>

				<Separator />
				<div className="flex items-center justify-between gap-2 p-3">
					<Button
						variant="ghost"
						size="lg"
						onClick={() => {
							setBands(DEFAULT_FILTER.bands);
							setSort(DEFAULT_FILTER.sort);
						}}
					>
						<RotateCcw data-icon="inline-start" />
						{t.filter.reset}
					</Button>
					<div className="flex items-center gap-3">
						{nothingPicked && <span className="text-xs text-muted-foreground">{t.filter.pickOne}</span>}
						<Button
							size="lg"
							className="h-10 rounded-full px-5"
							disabled={nothingPicked}
							onClick={() => {
								onApply({ bands, sort });
								setOpen(false);
							}}
						>
							{plural(t.filter.apply, matching, locale)}
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
