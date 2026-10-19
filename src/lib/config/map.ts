import { citiesInRegion, type RegionId } from './cities';

export interface Bounds {
	west: number;
	south: number;
	east: number;
	north: number;
}

/** All of Indonesia, Sabang to Merauke and Rote to Miangas. The tile proxy refuses anything outside. */
export const MAP_BOUNDS: Bounds = { west: 94.5, south: -11.5, east: 141.5, north: 6.5 };

/** Zoom 4 fits the whole country on a laptop screen. */
export const MAP_ZOOM = { initial: 8, min: 4, max: 14 };

/** Margin around a region's places, and the smallest span shown, in degrees. 2° matches the old Jambi view. */
const REGION_MARGIN = 0.2;
const REGION_MIN_SPAN = 2;

/**
 * The opening view for a region: its listed places with a margin. Many provinces list only their
 * capital, so the view never shrinks below REGION_MIN_SPAN around the places' centre.
 */
export function regionBounds(region: RegionId): Bounds {
	const cities = citiesInRegion(region);
	const lats = cities.map((city) => city.latitude);
	const lngs = cities.map((city) => city.longitude);
	const span = (min: number, max: number) => {
		const half = Math.max(max - min + 2 * REGION_MARGIN, REGION_MIN_SPAN) / 2;
		const mid = (min + max) / 2;
		return [mid - half, mid + half];
	};
	const [south, north] = span(Math.min(...lats), Math.max(...lats));
	const [west, east] = span(Math.min(...lngs), Math.max(...lngs));
	return { west, south, east, north };
}

/** Hotspots cover the whole map. */
export const FIRE_AREA: Bounds = MAP_BOUNDS;
export const FIRE_WINDOW_HOURS = 24;

/**
 * Wind is sampled on a regular grid over the map, since point forecasts are all the source offers.
 * 1.5° (about 165 km) keeps one refresh at 33 × 13 = 429 locations, inside Open-Meteo's
 * 600 calls a minute; the particles interpolate between them.
 */
export const WIND_GRID = { west: 94.5, south: -11.5, step: 1.5, columns: 33, rows: 13 } as const;
