import { describe, expect, it } from 'vitest';
import { createStaticMask, STATIC_HEAT_SOURCES } from './static-heat-sources';

const BONTANG_LNG: [number, number] = [0.0948, 117.4687];
/** `km` north of a [lat, lon] point. */
const north = ([latitude, longitude]: [number, number], km: number) => ({ latitude: latitude + km / 110.57, longitude });

describe('createStaticMask', () => {
	it('contains hotspots within the radius of a static point and none beyond it', () => {
		const mask = createStaticMask([BONTANG_LNG], 1);
		expect(mask.contains(north(BONTANG_LNG, 0.9))).toBe(true);
		expect(mask.contains(north(BONTANG_LNG, 1.1))).toBe(false);
	});

	it('finds a static point 0.95 km away on any side, wherever the grid lines fall', () => {
		const sides = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]];
		for (let i = 0; i < 50; i++) {
			const point: [number, number] = [-2.9 + i * 0.0037, 122.1 + i * 0.0041];
			const mask = createStaticMask([point], 1);
			for (const [dLat, dLon] of sides) {
				expect(mask.contains({ latitude: point[0] + (dLat * 0.95) / 110.57, longitude: point[1] + (dLon * 0.95) / 111.32 })).toBe(true);
			}
		}
	});

	it('contains nothing when there are no static points', () => {
		expect(createStaticMask([], 1).contains({ latitude: BONTANG_LNG[0], longitude: BONTANG_LNG[1] })).toBe(false);
	});
});

describe('STATIC_HEAT_SOURCES', () => {
	// Guards a regenerated file: these sites showed up as "fires" in the 21 Oct 2026 calibration or are known steady sources.
	it.each([
		['Bontang LNG', 0.0948, 117.4687],
		['Morowali smelters', -2.82, 122.16],
		['Weda Bay smelters', 0.48, 127.98],
		['Semeru crater', -8.108, 112.922]
	])('masks %s', (_, latitude, longitude) => {
		const nearest = [0, 0.5, 1, 1.5, 2].some((km) => STATIC_HEAT_SOURCES.contains({ latitude: latitude + km / 110.57, longitude }));
		expect(nearest).toBe(true);
	});

	it('leaves city centres alone', () => {
		expect(STATIC_HEAT_SOURCES.contains({ latitude: -2.99, longitude: 104.76 })).toBe(false);
		expect(STATIC_HEAT_SOURCES.contains({ latitude: -6.18, longitude: 106.83 })).toBe(false);
	});
});
