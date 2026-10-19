import { MAP_BOUNDS, type Bounds } from '@/lib/config/map';

/** The area a Web Mercator tile covers, in degrees. */
export function tileBounds(z: number, x: number, y: number): Bounds {
	const n = 2 ** z;
	const lat = (row: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * row) / n))) * 180) / Math.PI;
	return { west: (x / n) * 360 - 180, east: ((x + 1) / n) * 360 - 180, north: lat(y), south: lat(y + 1) };
}

export function intersects(a: Bounds, b: Bounds): boolean {
	return a.west < b.east && a.east > b.west && a.south < b.north && a.north > b.south;
}

/**
 * Whether the heatmap proxy serves this tile. The browser checks it too, so it never asks for a tile the proxy
 * refuses (those requests would only count toward the rate limit, and retry).
 */
export function tileInBounds(z: number, x: number, y: number): boolean {
	return intersects(tileBounds(z, x, y), MAP_BOUNDS);
}
