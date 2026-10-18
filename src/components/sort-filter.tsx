'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDownAZ, Check, ChevronDown, Circle, List, RotateCcw, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { AQI_BANDS } from '@/lib/aqi';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type SortKey = 'default' | 'best' | 'worst' | 'name';

export interface ListFilter {
	/** Indexes into AQI_BANDS that stay visible. Bands, not a range, so non-adjacent picks are possible. */
	bands: number[];
	sort: SortKey;
}

const ALL_BANDS = AQI_BANDS.map((_, i) => i);

export const DEFAULT_FILTER: ListFilter = { bands: ALL_BANDS, sort: 'default' };

/**
 * Best and worst borrow the face and fill of the top and bottom AQI bands, matching the solid band buttons above;
 * the neutral orders use the app's blue. White text passes AA on all three (5.0, 5.8, 6.4).
 */
const SORT_OPTIONS: { value: SortKey; label: string; description: string; icon: LucideIcon; fill: string }[] = [
	{ value: 'default', label: 'Bawaan', description: 'Urutan bawaan, seperti daftar wilayah.', icon: List, fill: '#0b57d0' },
	{
		value: 'best',
		label: 'Terbaik',
		description: 'AQI tertinggi dulu: udara terbaik di atas.',
		icon: AQI_BANDS.at(-1)!.icon,
		fill: AQI_BANDS.at(-1)!.fill
	},
	{ value: 'worst', label: 'Terburuk', description: 'AQI terendah dulu: udara terburuk di atas.', icon: AQI_BANDS[0].icon, fill: AQI_BANDS[0].fill },
	{ value: 'name', label: 'A–Z', description: 'Nama kota dari A sampai Z.', icon: ArrowDownAZ, fill: '#0b57d0' }
];

/** Stiffer than the navbar's spring: the hop is short, and the thumb must land as the label turns white. */
const THUMB = { type: 'spring', stiffness: 700, damping: 48, mass: 0.6 } as const;

export function isFiltered(filter: ListFilter) {
	return filter.bands.length < AQI_BANDS.length || filter.sort !== 'default';
}

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
 * Edits are a draft until "Tampilkan N lokasi", which states the result before it is applied.
 */
export function SortFilter({ value, onApply, bandCounts, pendingCount, compact = false }: Props & { compact?: boolean }) {
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

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				{compact ? (
					// Icon only on phones; the dot keeps an active sort or filter visible without the label.
					<Button variant="outline" size="icon" className="relative size-11 rounded-full bg-card" aria-label="Urutkan & filter">
						<SlidersHorizontal aria-hidden="true" />
						{isFiltered(value) && (
							<span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-card">
								<span className="sr-only">(aktif)</span>
							</span>
						)}
					</Button>
				) : (
					<Button variant="outline" size="lg" className="h-10 rounded-full bg-card px-4">
						<SlidersHorizontal data-icon="inline-start" />
						Urutkan &amp; filter
						{isFiltered(value) && (
							<span className="size-2 rounded-full bg-primary">
								<span className="sr-only">(aktif)</span>
							</span>
						)}
						<ChevronDown data-icon="inline-end" className="text-muted-foreground" />
					</Button>
				)}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				collisionPadding={16}
				className="w-[min(420px,calc(100vw-32px))] gap-0 overflow-hidden rounded-3xl p-0"
			>
				<div className="grid gap-5 p-5">
					<div>
						<p className="font-display text-2xl leading-tight">Tampilkan lokasi dengan udara…</p>
						<p className="mt-1 text-sm text-muted-foreground">Ketuk satu atau beberapa kategori.</p>
					</div>

					<div role="group" aria-label="Kategori AQI" className="flex gap-1">
						{AQI_BANDS.map((band, i) => {
							const on = bands.includes(i);
							const max = (AQI_BANDS[i + 1]?.min ?? 101) - 1;
							const Icon = on ? Check : Circle;
							return (
								<button
									key={band.min}
									type="button"
									aria-pressed={on}
									aria-label={`${band.label}, AQI ${band.min} sampai ${max}, ${bandCounts[i] ?? 0} lokasi`}
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
										<span className="leading-tight font-semibold">{band.label}</span>
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
							Urutkan
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
							<motion.span
								aria-hidden="true"
								className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-full shadow-sm"
								initial={false}
								animate={{ x: `${SORT_OPTIONS.findIndex((option) => option.value === sort) * 100}%`, backgroundColor: active.fill }}
								transition={{ x: THUMB, backgroundColor: { duration: 0.12 } }}
							/>
							{SORT_OPTIONS.map(({ value: key, label, icon: Icon }) => (
								<ToggleGroupItem
									key={key}
									value={key}
									// The toggle's own on-state paints an opaque muted fill over the thumb; clear it, and recolor without delay.
									className="relative h-9 flex-1 gap-1.5 rounded-full! text-muted-foreground transition-none hover:bg-transparent hover:text-foreground data-[state=on]:bg-transparent data-[state=on]:font-semibold data-[state=on]:text-white"
								>
									<Icon className="max-sm:hidden" aria-hidden="true" />
									{label}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
						<p id="sort-description" className="text-xs text-muted-foreground">
							{active.description}
						</p>
					</div>

					{pendingCount > 0 && (
						<p className="text-xs text-muted-foreground">{pendingCount} lokasi yang datanya belum termuat tetap ditampilkan.</p>
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
						Atur ulang
					</Button>
					<div className="flex items-center gap-3">
						{nothingPicked && <span className="text-xs text-muted-foreground">Pilih minimal satu</span>}
						<Button
							size="lg"
							className="h-10 rounded-full px-5"
							disabled={nothingPicked}
							onClick={() => {
								onApply({ bands, sort });
								setOpen(false);
							}}
						>
							Tampilkan {matching} lokasi
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
