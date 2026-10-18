import { describe, expect, it } from 'vitest';
import { CITIES, ISLANDS, REGIONS } from './cities';

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
