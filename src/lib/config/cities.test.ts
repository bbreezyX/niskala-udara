import { describe, expect, it } from 'vitest';
import { CITIES, ISLANDS, nearestCities, REGIONS } from './cities';

// Static routes that share /location/ with city ids; a city with one of these ids would be unreachable.
const RESERVED_LOCATION_IDS = ['me', 'point'];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe.each([
	['ISLANDS', ISLANDS.map((i) => i.id)],
	['REGIONS', REGIONS.map((r) => r.id)],
	['CITIES', CITIES.map((c) => c.id)]
])('%s ids', (_, ids) => {
	it('are lowercase hyphenated slugs', () => {
		expect(ids.filter((id) => !SLUG.test(id))).toEqual([]);
	});

	it('are unique', () => {
		expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
	});
});

describe('CITIES', () => {
	it('never takes a reserved /location/ segment', () => {
		expect(CITIES.filter((c) => RESERVED_LOCATION_IDS.includes(c.id)).map((c) => c.id)).toEqual([]);
	});
});

describe('nearestCities', () => {
	it('orders cities by distance from a point', () => {
		// A point in Jambi city: Kota Jambi first, Muaro Jambi (Sengeti) close behind.
		const nearest = nearestCities({ latitude: -1.61, longitude: 103.61 }, 3);
		expect(nearest).toHaveLength(3);
		expect(nearest[0].city.id).toBe('kota-jambi');
		expect(nearest[0].km).toBeLessThan(5);
		expect(nearest[1].km).toBeGreaterThanOrEqual(nearest[0].km);
	});

	it('picks the closest city outside Jambi too', () => {
		const [jakarta] = nearestCities({ latitude: -6.2, longitude: 106.8 }, 1);
		const [bandung] = nearestCities({ latitude: -6.91, longitude: 107.61 }, 1);
		expect(jakarta.city.region).toBe('dki-jakarta');
		expect(bandung.city.id).toBe('bandung');
	});
});
