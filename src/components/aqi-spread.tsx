'use client';

import { AQI_BANDS } from '@/lib/aqi';
import { cn } from '@/lib/utils';
import { DEFAULT_FILTER, type ListFilter } from './sort-filter';

interface Props {
	/** Locations currently in each band, by AQI_BANDS index. */
	bandCounts: number[];
	/** Locations without data yet, drawn as a neutral segment so the bar always adds up to the total. */
	pendingCount: number;
	filter: ListFilter;
	onFilter: (next: ListFilter) => void;
}

/**
 * The region at a glance: one segment per AQI band, sized by how many locations sit in it. A segment
 * narrows the list to its band; clicking the band that is already isolated shows every band again.
 */
export function AqiSpread({ bandCounts, pendingCount, filter, onFilter }: Props) {
	const total = pendingCount + bandCounts.reduce((sum, count) => sum + count, 0);
	const worst = bandCounts.findIndex((count) => count > 0);
	const isolated = filter.bands.length === 1 ? filter.bands[0] : null;

	return (
		<div className="flex items-center gap-3">
			<div role="group" aria-label="Sebaran kategori AQI" className="flex h-6 w-44 items-center gap-0.5">
				{AQI_BANDS.map((band, i) => {
					const count = bandCounts[i] ?? 0;
					if (count === 0) return null;
					const only = isolated === i;
					return (
						<button
							key={band.min}
							type="button"
							aria-pressed={only}
							aria-label={`${band.label}: ${count} lokasi. ${only ? 'Tampilkan semua kategori' : 'Tampilkan kategori ini saja'}`}
							title={`${band.label}: ${count} lokasi`}
							onClick={() => onFilter({ ...filter, bands: only ? DEFAULT_FILTER.bands : [i] })}
							style={{ flexGrow: count }}
							className="group flex h-full basis-0 items-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<span
								className={cn(
									'block h-2 w-full rounded-[2px] transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-y-150',
									!filter.bands.includes(i) && 'opacity-30'
								)}
								style={{ background: band.fill }}
							/>
						</button>
					);
				})}
				{pendingCount > 0 && <span aria-hidden="true" style={{ flexGrow: pendingCount }} className="h-2 basis-0 rounded-[2px] bg-muted" />}
			</div>
			<p className="text-sm text-muted-foreground tabular-nums">
				{total} lokasi
				{worst >= 0 && ` · ${bandCounts[worst]} ${AQI_BANDS[worst].label.toLowerCase()}`}
			</p>
		</div>
	);
}
