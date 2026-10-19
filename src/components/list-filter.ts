import { AQI_BANDS } from '@/lib/aqi';

export type SortKey = 'default' | 'best' | 'worst' | 'name';

export interface ListFilter {
	/** Indexes into AQI_BANDS that stay visible. Bands, not a range, so non-adjacent picks are possible. */
	bands: number[];
	sort: SortKey;
}

const ALL_BANDS = AQI_BANDS.map((_, i) => i);

export const DEFAULT_FILTER: ListFilter = { bands: ALL_BANDS, sort: 'default' };

export function isFiltered(filter: ListFilter) {
	return filter.bands.length < AQI_BANDS.length || filter.sort !== 'default';
}
