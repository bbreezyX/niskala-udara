import { describe, expect, it } from 'vitest';
import type { Hotspot } from '@/lib/types';
import { ageClass, intensityClass, shownHotspots } from './hotspot-encoding';

const hotspot = (confidence: Hotspot['confidence']): Hotspot => ({
	latitude: -2.99,
	longitude: 104.76,
	acquiredAt: '2026-10-21T05:30:00.000Z',
	satellite: 'NOAA-20',
	confidence,
	frp: 5
});

describe('intensityClass', () => {
	it('splits FRP at 10 and 50 MW, with a missing value in the smallest class', () => {
		expect([null, 0, 9.99, 10, 49.9, 50, 300].map(intensityClass)).toEqual([0, 0, 0, 1, 1, 2, 2]);
	});
});

describe('ageClass', () => {
	it('splits age at 6 and 12 hours, and anything older falls in the last class', () => {
		expect([-0.5, 0, 5.9, 6, 11.9, 12, 30].map(ageClass)).toEqual([0, 0, 0, 1, 1, 2, 2]);
	});
});

describe('shownHotspots', () => {
	it('drops low confidence unless asked to show it', () => {
		const list = [hotspot('high'), hotspot('nominal'), hotspot('low')];
		expect(shownHotspots(list, false).map((h) => h.confidence)).toEqual(['high', 'nominal']);
		expect(shownHotspots(list, true)).toHaveLength(3);
	});
});
