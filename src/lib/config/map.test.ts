import { describe, expect, it } from 'vitest';
import { citiesInRegion } from './cities';
import { regionBounds } from './map';

describe('regionBounds', () => {
	it('frames every listed place of a region with a margin', () => {
		const bounds = regionBounds('jambi');
		for (const city of citiesInRegion('jambi')) {
			expect(city.latitude).toBeGreaterThan(bounds.south);
			expect(city.latitude).toBeLessThan(bounds.north);
			expect(city.longitude).toBeGreaterThan(bounds.west);
			expect(city.longitude).toBeLessThan(bounds.east);
		}
	});

	it('keeps a region with one listed place at a readable size around it', () => {
		const [denpasar] = citiesInRegion('bali');
		const bounds = regionBounds('bali');
		expect(bounds.north - bounds.south).toBeCloseTo(2);
		expect(bounds.east - bounds.west).toBeCloseTo(2);
		expect((bounds.north + bounds.south) / 2).toBeCloseTo(denpasar.latitude);
		expect((bounds.east + bounds.west) / 2).toBeCloseTo(denpasar.longitude);
	});
});
