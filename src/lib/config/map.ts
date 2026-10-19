export interface Bounds {
	west: number;
	south: number;
	east: number;
	north: number;
}

/** All of Indonesia, Sabang to Merauke and Rote to Miangas. The tile proxy refuses anything outside. */
export const MAP_BOUNDS: Bounds = { west: 94.5, south: -11.5, east: 141.5, north: 6.5 };

export const MAP_CENTER = { lat: -1.65, lng: 102.9 };
/** Zoom 4 fits the whole country on a laptop screen. */
export const MAP_ZOOM = { initial: 8, min: 4, max: 14 };

/** Hotspots cover the whole map. */
export const FIRE_AREA: Bounds = MAP_BOUNDS;
export const FIRE_WINDOW_HOURS = 24;

/**
 * Wind is sampled on a regular grid over the map, since point forecasts are all the source offers.
 * 1.5° (about 165 km) keeps one refresh at 33 × 13 = 429 locations, inside Open-Meteo's
 * 600 calls a minute; the particles interpolate between them.
 */
export const WIND_GRID = { west: 94.5, south: -11.5, step: 1.5, columns: 33, rows: 13 } as const;
