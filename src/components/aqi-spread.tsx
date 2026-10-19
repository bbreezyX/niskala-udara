'use client';

import { AQI_BANDS, bandEdge } from '@/lib/aqi';
import { fill, plural } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { DEFAULT_FILTER, type ListFilter } from './list-filter';
import { useDictionary, useLocale } from './locale-provider';

interface Props {
	/** Locations currently in each band, by AQI_BANDS index. */
	bandCounts: number[];
	/** Locations without data yet, drawn as a neutral segment so the bar always adds up to the total. */
	pendingCount: number;
	filter: ListFilter;
	onFilter: (next: ListFilter) => void;
	/** `inline`: a short bar beside its summary (desktop hero). `stacked`: a full-width bar over it (phones). */
	layout?: 'inline' | 'stacked';
	/** Shown at the end of the summary row in the stacked layout, e.g. the data time. */
	aside?: React.ReactNode;
}

/**
 * The region at a glance: one segment per AQI band, sized by how many locations sit in it. A segment
 * narrows the list to its band; clicking the band that is already isolated shows every band again.
 */
/** Upper-cases the first letter, e.g. "11 lokasi" becomes "11 Lokasi". */
function capitalize(text: string): string {
	return text.replace(/\p{L}/u, (letter) => letter.toUpperCase());
}

export function AqiSpread({ bandCounts, pendingCount, filter, onFilter, layout = 'inline', aside }: Props) {
	const t = useDictionary();
	const locale = useLocale();
	const total = pendingCount + bandCounts.reduce((sum, count) => sum + count, 0);
	const worst = bandCounts.findIndex((count) => count > 0);
	const isolated = filter.bands.length === 1 ? filter.bands[0] : null;

	return (
		<div className={layout === 'inline' ? 'flex items-center gap-3' : 'grid gap-2'}>
			<div role="group" aria-label={t.spread.label} className={cn('flex h-6 items-center gap-0.5', layout === 'inline' ? 'w-44' : 'w-full')}>
				{AQI_BANDS.map((band, i) => {
					const count = bandCounts[i] ?? 0;
					if (count === 0) return null;
					const only = isolated === i;
					const segment = fill(t.spread.segment, { band: t.aqi.bands[band.key], count: plural(t.common.locations, count, locale) });
					return (
						<button
							key={band.min}
							type="button"
							aria-pressed={only}
							aria-label={`${segment}. ${only ? t.spread.showAll : t.spread.showOnly}`}
							title={segment}
							onClick={() => onFilter({ ...filter, bands: only ? DEFAULT_FILTER.bands : [i] })}
							style={{ flexGrow: count }}
							className="group flex h-full basis-0 items-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<span
								className={cn(
									'block h-2 w-full rounded-[2px] transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-y-150',
									!filter.bands.includes(i) && 'opacity-30'
								)}
								style={{ background: band.fill, boxShadow: bandEdge(band) }}
							/>
						</button>
					);
				})}
				{pendingCount > 0 && <span aria-hidden="true" style={{ flexGrow: pendingCount }} className="h-2 basis-0 rounded-[2px] bg-muted" />}
			</div>
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
				{/* Label case, like the band names: "11 Lokasi · 8 Rendah". */}
				<p className="text-sm text-muted-foreground tabular-nums">
					{capitalize(plural(t.common.locations, total, locale))}
					{worst >= 0 && fill(t.spread.worst, { n: String(bandCounts[worst]), band: t.aqi.bands[AQI_BANDS[worst].key] })}
				</p>
				{layout === 'stacked' && aside}
			</div>
		</div>
	);
}
