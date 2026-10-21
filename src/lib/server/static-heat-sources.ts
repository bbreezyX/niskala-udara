import { distanceKm } from '@/lib/smoke-trace';
import type { Coordinates } from '@/lib/types';
import data from './static-heat-sources.json';

/**
 * How close a hotspot must be to a known static source to be treated as that source: a VIIRS pixel is
 * 375 m wide and its position scatters a few hundred metres between overpasses.
 */
export const STATIC_RADIUS_KM = 1;

export interface StaticMask {
	contains(point: Coordinates): boolean;
}

/** Points of steady non-fire heat (flares, smelters, volcanoes), as [latitude, longitude], indexed on a grid. */
export function createStaticMask(points: readonly (readonly [number, number])[], radiusKm = STATIC_RADIUS_KM): StaticMask {
	// Cells two radii tall, so every point within reach sits in the hotspot's cell or a neighbouring one,
	// even where a degree of longitude is a little shorter than a degree of latitude.
	const size = (2 * radiusKm) / 110.57;
	const cell = (latitude: number, longitude: number) => [Math.floor(latitude / size), Math.floor(longitude / size)];
	const grid = new Map<string, Coordinates[]>();
	for (const [latitude, longitude] of points) {
		const key = cell(latitude, longitude).join(':');
		const bucket = grid.get(key);
		if (bucket) bucket.push({ latitude, longitude });
		else grid.set(key, [{ latitude, longitude }]);
	}

	return {
		contains(point) {
			const [row, col] = cell(point.latitude, point.longitude);
			for (let dr = -1; dr <= 1; dr++) {
				for (let dc = -1; dc <= 1; dc++) {
					for (const source of grid.get(`${row + dr}:${col + dc}`) ?? []) {
						if (distanceKm(point, source) <= radiusKm) return true;
					}
				}
			}
			return false;
		}
	};
}

/**
 * The shipped mask, built by scripts/build-static-heat-sources.mjs from NASA's standard-processing labels
 * (12 months, both VIIRS satellites). Server-only: about 20 KB that browsers never need.
 */
export const STATIC_HEAT_SOURCES = createStaticMask(data.points as [number, number][]);
