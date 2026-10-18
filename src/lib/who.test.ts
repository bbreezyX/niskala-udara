import { describe, expect, it } from 'vitest';
import { whoRatio } from './who';

const ugm3 = 'MICROGRAMS_PER_CUBIC_METER';
const ppb = 'PARTS_PER_BILLION';

describe('whoRatio', () => {
	it('compares particles in µg/m³ directly', () => {
		expect(whoRatio({ code: 'pm25', value: 30, units: ugm3 })).toBeCloseTo(2);
		expect(whoRatio({ code: 'pm10', value: 45, units: ugm3 })).toBeCloseTo(1);
	});

	it('converts gases from ppb before comparing', () => {
		// 25 µg/m³ NO₂ is about 13.29 ppb at 25 °C.
		expect(whoRatio({ code: 'no2', value: 13.29, units: ppb })).toBeCloseTo(1, 2);
		// 4 mg/m³ CO is about 3,492 ppb.
		expect(whoRatio({ code: 'co', value: 3492, units: ppb })).toBeCloseTo(1, 2);
		expect(whoRatio({ code: 'o3', value: 50.94, units: ppb })).toBeCloseTo(1, 2);
		expect(whoRatio({ code: 'so2', value: 15.26, units: ppb })).toBeCloseTo(1, 2);
	});

	it('returns null for units it cannot convert', () => {
		expect(whoRatio({ code: 'pm25', value: 30, units: 'UNIT_UNSPECIFIED' })).toBeNull();
		expect(whoRatio({ code: 'pm25', value: 30, units: ppb })).toBeNull();
	});

	it('keeps a zero reading at zero', () => {
		expect(whoRatio({ code: 'so2', value: 0, units: ppb })).toBe(0);
	});
});
