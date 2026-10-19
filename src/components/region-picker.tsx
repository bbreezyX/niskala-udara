'use client';

import { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { CITIES, DEFAULT_REGION, ISLANDS, placeName, REGIONS, type RegionId } from '@/lib/config/cities';
import { fill, plural } from '@/lib/i18n/config';
import { useDropdownBelow } from '@/lib/client/dropdown-below';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDictionary, useLocale } from './locale-provider';

const COUNTS = new Map(REGIONS.map((region) => [region.id, CITIES.filter((city) => city.region === region.id).length]));

/** Region names in both languages plus every city in them, so searching "Kerinci" finds Jambi and "West Java" finds Jawa Barat. */
const KEYWORDS = new Map(
	REGIONS.map((region) => [region.id, [region.name, region.nameEn, ...CITIES.filter((city) => city.region === region.id).map((city) => city.name)]])
);

/** Substring match: fuzzy matching surfaces unrelated places. */
function filterRegions(_: string, query: string, keywords: string[] = []) {
	const needle = query.trim().toLocaleLowerCase('id');
	return keywords.some((keyword) => keyword.toLocaleLowerCase('id').includes(needle)) ? 1 : 0;
}

/**
 * One button for the active region; its list is grouped by island, searchable, and scales to any number of regions.
 * `title` renders it as the list heading itself (mobile), `display` as the larger heading in the hero notch
 * (desktop), `pill` as a control beside a heading.
 */
export function RegionPicker({
	value,
	onChange,
	variant = 'pill'
}: {
	value: RegionId;
	onChange: (next: RegionId) => void;
	variant?: 'pill' | 'title' | 'display';
}) {
	const [open, setOpen] = useState(false);
	const below = useDropdownBelow();
	const t = useDictionary();
	const locale = useLocale();
	const current = REGIONS.find((region) => region.id === value) ?? REGIONS.find((region) => region.id === DEFAULT_REGION)!;
	const islands = ISLANDS.map((island) => ({ ...island, regions: REGIONS.filter((region) => region.island === island.id) })).filter(
		(island) => island.regions.length > 0
	);

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				if (next) below.makeRoom();
				setOpen(next);
			}}
		>
			<PopoverTrigger asChild>
				<Button
					ref={below.triggerRef}
					variant={variant === 'pill' ? 'outline' : 'ghost'}
					size="lg"
					aria-label={fill(t.regionPicker.trigger, { name: placeName(current, locale) })}
					className={cn(
						variant === 'title' && '-ml-2 h-11 min-w-0 rounded-full px-2 font-heading text-xl font-semibold text-foreground [&_svg:not([class*=size-])]:size-5',
						variant === 'display' &&
							'-ml-3 h-auto gap-2.5 rounded-2xl px-3 py-1.5 font-heading text-2xl leading-tight font-semibold text-foreground [&_svg:not([class*=size-])]:size-5',
						variant === 'pill' && 'h-10 rounded-full border-input bg-card px-4 font-semibold text-primary hover:text-primary'
					)}
				>
					{variant !== 'display' && <MapPin data-icon="inline-start" className={cn(variant === 'title' && 'text-primary')} />}
					<span className={cn(variant !== 'display' && 'truncate')}>{placeName(current, locale)}</span>
					<ChevronDown data-icon="inline-end" className="text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={8} {...below.contentProps} className="w-76 overflow-hidden rounded-2xl p-0">
				<Command ref={below.commandRef} filter={filterRegions} loop>
					<CommandInput placeholder={t.regionPicker.placeholder} className="h-10" />
					<CommandList className="max-h-[min(20rem,calc(var(--radix-popover-content-available-height)-3.5rem))]">
						<CommandEmpty>{t.regionPicker.empty}</CommandEmpty>
						{islands.map((island) => (
							<CommandGroup
								key={island.id}
								heading={placeName(island, locale)}
								// Island headings are category labels, not choices: small caps-style text that stays pinned while
								// its provinces scroll under it. The group must not clip, or sticky has nothing to stick to.
								className="overflow-visible **:[[cmdk-group-items]]:flex **:[[cmdk-group-items]]:flex-col **:[[cmdk-group-items]]:gap-1 **:[[cmdk-group-heading]]:sticky **:[[cmdk-group-heading]]:top-0 **:[[cmdk-group-heading]]:z-10 **:[[cmdk-group-heading]]:bg-popover **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:pt-3 **:[[cmdk-group-heading]]:pb-1.5 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:tracking-[0.08em] **:[[cmdk-group-heading]]:uppercase"
							>
								{island.regions.map((region) => {
									const active = region.id === value;
									return (
										<CommandItem
											key={region.id}
											value={region.id}
											keywords={KEYWORDS.get(region.id)}
											onSelect={() => {
												onChange(region.id);
												setOpen(false);
											}}
											// No check column: the active row is tinted instead, so every count sits flush right.
											className={cn(
												'min-h-10 gap-3 rounded-lg px-3 [&>svg:last-child]:hidden',
												active && 'bg-secondary font-semibold text-secondary-foreground data-selected:bg-secondary'
											)}
										>
											<span className="min-w-0 flex-1 truncate">
												{placeName(region, locale)}
												{active && <span className="sr-only">{t.regionPicker.selected}</span>}
											</span>
											<span className="text-xs font-normal text-muted-foreground tabular-nums">{plural(t.common.locations, COUNTS.get(region.id) ?? 0, locale)}</span>
										</CommandItem>
									);
								})}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
