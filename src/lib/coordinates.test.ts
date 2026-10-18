import { describe, expect, it } from 'vitest';
import { parseCoordinates, parseHistoryRequest, roundCoordinates } from './coordinates.ts';

describe('parseCoordinates', () => {
	it('accepts valid coordinates, including the range edges', () => {
		expect(parseCoordinates({ latitude: -6.1754, longitude: 106.8272 })).toEqual({
			latitude: -6.1754,
			longitude: 106.8272
		});
		expect(parseCoordinates({ latitude: 90, longitude: -180 })).not.toBeNull();
		expect(parseCoordinates({ latitude: 0, longitude: 0 })).not.toBeNull();
	});

	it.each([
		['out-of-range latitude', { latitude: 91, longitude: 0 }],
		['out-of-range longitude', { latitude: 0, longitude: 180.1 }],
		['string numbers', { latitude: '-6.1', longitude: '106.8' }],
		['NaN', { latitude: Number.NaN, longitude: 0 }],
		['Infinity', { latitude: 0, longitude: Number.POSITIVE_INFINITY }],
		['missing field', { latitude: 0 }],
		['extra field', { latitude: 0, longitude: 0, url: 'https://example.com' }],
		['array', [0, 0]],
		['null', null]
	])('rejects %s', (_, input) => {
		expect(parseCoordinates(input)).toBeNull();
	});
});

describe('roundCoordinates', () => {
	it('rounds to three decimals', () => {
		expect(roundCoordinates({ latitude: -6.175432, longitude: 106.827198 })).toEqual({
			latitude: -6.175,
			longitude: 106.827
		});
	});
});

describe('parseHistoryRequest', () => {
	it('accepts the supported ranges only', () => {
		expect(parseHistoryRequest({ latitude: 0, longitude: 0, hours: 24 })).toEqual({
			coordinates: { latitude: 0, longitude: 0 },
			hours: 24
		});
		expect(parseHistoryRequest({ latitude: 0, longitude: 0, hours: 72 })).not.toBeNull();
		expect(parseHistoryRequest({ latitude: 0, longitude: 0, hours: 48 })).toBeNull();
		expect(parseHistoryRequest({ latitude: 0, longitude: 0, hours: '24' })).toBeNull();
		expect(parseHistoryRequest({ latitude: 0, longitude: 0, hours: 24, extra: 1 })).toBeNull();
	});
});
