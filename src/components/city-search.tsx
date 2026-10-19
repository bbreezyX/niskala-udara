'use client';

import { LocateFixed, MapPin } from 'lucide-react';
import { CITIES, placeName, REGIONS } from '@/lib/config/cities';
import { CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { useDictionary, useLocale } from './locale-provider';

/** Substring match on the name and reference point: fuzzy matching surfaces unrelated places. */
export function filterCities(_: string, query: string, keywords: string[] = []) {
	const needle = query.trim().toLocaleLowerCase('id');
	return keywords.some((keyword) => keyword.toLocaleLowerCase('id').includes(needle)) ? 1 : 0;
}

/** Every row is icon then name, so the names share one left edge. */
const ROW = 'min-h-11 gap-3 rounded-xl px-3';

/** Group headings start at the row icons' edge. */
const GROUP = '**:[[cmdk-group-heading]]:px-3';

/** Search results for the navbar search: the device location first, then every city grouped by region. */
export function CityResults({ onGo }: { onGo: (href: string) => void }) {
	const { search } = useDictionary();
	const locale = useLocale();
	return (
		<>
			<CommandEmpty>{search.empty}</CommandEmpty>
			<CommandGroup heading={search.locationGroup} className={GROUP}>
				<CommandItem value="saya" keywords={[search.myLocation, ...search.myLocationKeywords]} onSelect={() => onGo('/location/me')} className={ROW}>
					<LocateFixed className="text-primary" />
					<span className="truncate font-medium">{search.myLocation}</span>
				</CommandItem>
			</CommandGroup>
			{REGIONS.map((region) => (
				<CommandGroup key={region.id} heading={placeName(region, locale)} className={GROUP}>
					{CITIES.filter((city) => city.region === region.id).map((city) => (
						<CommandItem
							key={city.id}
							value={city.id}
							keywords={[city.name, city.point, region.name, region.nameEn]}
							onSelect={() => onGo(`/location/${city.id}`)}
							className={ROW}
						>
							<MapPin className="text-muted-foreground" />
							<span className="truncate font-medium">{city.name}</span>
						</CommandItem>
					))}
				</CommandGroup>
			))}
		</>
	);
}
