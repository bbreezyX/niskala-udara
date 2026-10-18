export interface Bounds {
	west: number;
	south: number;
	east: number;
	north: number;
}

/** The map is limited to Sumatra: all of it is WIB, and the tile proxy refuses anything outside. */
export const MAP_BOUNDS: Bounds = { west: 94.5, south: -6.5, east: 106.8, north: 6.5 };

export const MAP_CENTER = { lat: -1.65, lng: 102.9 };
export const MAP_ZOOM = { initial: 8, min: 6, max: 14 };
export const MAP_TIME_ZONE = 'Asia/Jakarta';

/** Hotspot area: Provinsi Jambi plus a margin, since smoke from neighbouring fires drifts in. */
export const FIRE_AREA: Bounds = { west: 100.7, south: -3.2, east: 104.9, north: -0.5 };
export const FIRE_WINDOW_HOURS = 24;
