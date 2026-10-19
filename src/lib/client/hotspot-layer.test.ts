import { describe, expect, it } from 'vitest';
import type { Hotspot } from '@/lib/types';
import { HotspotLayer, toWorld } from './hotspot-layer';

const hotspot = (latitude: number, longitude: number, confidence: Hotspot['confidence']): Hotspot => ({
	latitude,
	longitude,
	confidence,
	acquiredAt: '2026-10-18T06:14:00.000Z',
	satellite: 'NOAA-20',
	frp: null
});

const style = ({ confidence }: Hotspot) => ({ color: '#000', radius: 5, rank: confidence === 'high' ? 3 : 1 });

describe('toWorld', () => {
	it('matches Web Mercator world coordinates', () => {
		expect(toWorld(0, 0)).toEqual({ x: 128, y: 128 });
		expect(toWorld(0, 180).x).toBe(256);
		expect(toWorld(85.0511, 0).y).toBeCloseTo(0, 2);
	});
});

describe('HotspotLayer.hit', () => {
	// At zoom 10 one CSS pixel is about 0.00137° of longitude.
	const pixel = 360 / 256 / 2 ** 10;

	it('finds a hotspot within its radius plus the tolerance, and nothing beyond', () => {
		const target = hotspot(-1.6, 103.6, 'low');
		const layer = new HotspotLayer([target], style);
		expect(layer.hit(-1.6, 103.6 + 8 * pixel, 10, 4)).toBe(target);
		expect(layer.hit(-1.6, 103.6 + 10 * pixel, 10, 4)).toBeNull();
		// Zooming out shrinks the distance in pixels.
		expect(layer.hit(-1.6, 103.6 + 10 * pixel, 9, 4)).toBe(target);
	});

	it('prefers the nearest hotspot, and the top one when they overlap exactly', () => {
		const low = hotspot(-1.6, 103.6, 'low');
		const high = hotspot(-1.6, 103.6, 'high');
		const near = hotspot(-1.6, 103.6 + 6 * pixel, 'low');
		const layer = new HotspotLayer([high, low, near], style);
		expect(layer.hit(-1.6, 103.6, 10, 4)).toBe(high);
		expect(layer.hit(-1.6, 103.6 + 5 * pixel, 10, 4)).toBe(near);
	});
});
