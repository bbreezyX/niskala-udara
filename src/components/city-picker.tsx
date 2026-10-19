'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, ChevronDown, LocateFixed } from 'lucide-react';
import { CITIES, nearestCities, placeName, REGIONS, type City } from '@/lib/config/cities';
import { useDropdownBelow } from '@/lib/client/dropdown-below';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { numberFormat } from '@/lib/format';
import { fill } from '@/lib/i18n/config';
import { filterCities } from './city-filter';
import { useDictionary, useLocale } from './locale-provider';

const NEARBY_COUNT = 3;
const REGION_BY_ID = new Map<string, (typeof REGIONS)[number]>(REGIONS.map((region) => [region.id, region]));

export type Nearby =
	| { status: 'checking' | 'idle' | 'denied' | 'unavailable' }
	| { status: 'locating'; auto: boolean }
	| { status: 'ready'; list: { city: City; km: number }[] };

/**
 * The cities closest to the device. It locates on its own only when location access was already
 * granted; otherwise it waits for `locate()`, so the page never opens with a permission prompt.
 */
export function useNearby() {
	const [nearby, setNearby] = useState<Nearby>({ status: 'checking' });

	const locate = useCallback((auto = false, onReady?: (nearest: City) => void) => {
		if (!('geolocation' in navigator)) {
			setNearby({ status: 'unavailable' });
			return;
		}
		setNearby({ status: 'locating', auto });
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				const list = nearestCities(coords, NEARBY_COUNT);
				setNearby({ status: 'ready', list });
				onReady?.(list[0].city);
			},
			(error) => setNearby({ status: error.code === error.PERMISSION_DENIED ? 'denied' : auto ? 'idle' : 'unavailable' }),
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
		);
	}, []);

	useEffect(() => {
		if (!('geolocation' in navigator)) {
			setNearby({ status: 'unavailable' });
			return;
		}
		let active = true;
		// Safari before 16 has no geolocation permission query; treat it as "not granted yet".
		Promise.resolve(navigator.permissions?.query({ name: 'geolocation' }))
			.then((permission) => {
				if (!active) return;
				if (permission?.state === 'granted') locate(true);
				else setNearby({ status: permission?.state === 'denied' ? 'denied' : 'idle' });
			})
			.catch(() => active && setNearby({ status: 'idle' }));
		return () => {
			active = false;
		};
	}, [locate]);

	return { nearby, locate };
}

interface Props {
	value: City;
	onChange: (city: City) => void;
	nearby: Nearby;
	onLocate: () => void;
	/** `heading`: the city name itself is the trigger, styled as an operational heading for the data card. */
	variant?: 'field' | 'heading';
	className?: string;
}

/** Searchable city list: the closest cities first (once the device location is known), then every city by province. */
export function CityPicker({ value, onChange, nearby, onLocate, variant = 'field', className }: Props) {
	const [open, setOpen] = useState(false);
	const below = useDropdownBelow();
	const locale = useLocale();
	const { cityPicker } = useDictionary();

	function pick(city: City) {
		onChange(city);
		setOpen(false);
	}

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				if (next) below.makeRoom();
				setOpen(next);
			}}
		>
			<PopoverTrigger asChild>
				{variant === 'heading' ? (
					<button
						ref={below.triggerRef}
						type="button"
						aria-label={fill(cityPicker.trigger, { name: value.name })}
						className={cn(
							'group inline-flex max-w-full items-center gap-1.5 rounded-lg text-left font-heading text-2xl leading-tight font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
							className
						)}
					>
						<span className="truncate decoration-input decoration-1 underline-offset-[6px] group-hover:underline">{value.name}</span>
						<ChevronDown
							className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-y-0.5 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
							aria-hidden="true"
						/>
					</button>
				) : (
					<Button
						ref={below.triggerRef}
						variant="outline"
						size="lg"
						aria-label={fill(cityPicker.trigger, { name: value.name })}
						className={cn('h-10 justify-between rounded-full border-input bg-card px-4 font-semibold', className)}
					>
						<span className="truncate">{value.name}</span>
						<ChevronDown data-icon="inline-end" className="text-muted-foreground" />
					</Button>
				)}
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={6} {...below.contentProps} className="w-80 max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl p-0">
				<Command ref={below.commandRef} filter={filterCities} loop>
					<CommandInput placeholder={cityPicker.placeholder} className="h-10" />
					<CommandList className="max-h-[min(24rem,calc(var(--radix-popover-content-available-height)-3.5rem))]">
						<CommandEmpty>{cityPicker.empty}</CommandEmpty>
						{nearby.status !== 'unavailable' && nearby.status !== 'checking' && (
							<CommandGroup heading={cityPicker.nearest}>
								{nearby.status === 'ready' ? (
									nearby.list.map(({ city, km }) => (
										<CommandItem
											key={city.id}
											value={`dekat:${city.id}`}
											keywords={[city.name, REGION_BY_ID.get(city.region)?.name ?? '', REGION_BY_ID.get(city.region)?.nameEn ?? '']}
											onSelect={() => pick(city)}
											className="min-h-10 gap-2"
										>
											<span className="flex-1">{city.name}</span>
											<span className="text-xs text-muted-foreground tabular-nums">± {numberFormat(locale, 0).format(km)} km</span>
											<CheckIcon className={cn('text-primary', city.id !== value.id && 'invisible')} aria-hidden="true" />
										</CommandItem>
									))
								) : (
									<CommandItem
										value="lokasi-saya"
										keywords={cityPicker.useMineKeywords}
										disabled={nearby.status === 'locating' || nearby.status === 'denied'}
										onSelect={onLocate}
										className="min-h-10 gap-2 text-primary data-[disabled=true]:text-muted-foreground"
									>
										<LocateFixed aria-hidden="true" />
										{nearby.status === 'locating'
											? cityPicker.locating
											: nearby.status === 'denied'
												? cityPicker.denied
												: cityPicker.useMine}
									</CommandItem>
								)}
							</CommandGroup>
						)}
						{REGIONS.map((region) => (
							<CommandGroup key={region.id} heading={placeName(region, locale)}>
								{CITIES.filter((city) => city.region === region.id).map((city) => (
									<CommandItem
										key={city.id}
										value={city.id}
										keywords={[city.name, region.name, region.nameEn]}
										onSelect={() => pick(city)}
										className={cn('min-h-10 gap-2', city.id === value.id && 'font-semibold text-secondary-foreground')}
									>
										<span className="flex-1">{city.name}</span>
										<CheckIcon className={cn('text-primary', city.id !== value.id && 'invisible')} aria-hidden="true" />
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
