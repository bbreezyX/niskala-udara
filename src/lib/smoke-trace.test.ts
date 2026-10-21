import { describe, expect, it } from 'vitest';
import { WIND_GRID } from '@/lib/config/map';
import { bearingDeg, distanceKm, traceBack, windAtTime, type WindHistory } from './smoke-trace';

const HOUR = 3600;
const NOW = Date.parse('2026-10-21T06:00:00Z') / 1000;
const PALEMBANG = { latitude: -2.99, longitude: 104.76 };

/** Every grid point blows from `direction` (degrees, where the wind comes from) at `speed` m/s, hourly from `first` to 24 h after NOW. */
function steadyWind(speed: number, direction: number, first = NOW - 24 * HOUR): WindHistory {
	const times = Array.from({ length: (NOW + 24 * HOUR - first) / HOUR + 1 }, (_, i) => first + i * HOUR);
	const points = WIND_GRID.columns * WIND_GRID.rows;
	return {
		grid: WIND_GRID,
		times,
		speeds: Array.from({ length: points }, () => times.map(() => speed)),
		directions: Array.from({ length: points }, () => times.map(() => direction))
	};
}

describe('windAtTime', () => {
	it('interpolates linearly between two hours', () => {
		const wind = steadyWind(2, 0);
		const hour = wind.times.indexOf(NOW);
		for (const speeds of wind.speeds) speeds[hour + 1] = 4;
		const at = windAtTime(wind, PALEMBANG.latitude, PALEMBANG.longitude, NOW + HOUR / 2)!;
		// From the north at 3 m/s: blowing south.
		expect(at.u).toBeCloseTo(0);
		expect(at.v).toBeCloseTo(-3);
	});

	it('has no wind outside the hours it holds', () => {
		const wind = steadyWind(2, 0);
		expect(windAtTime(wind, PALEMBANG.latitude, PALEMBANG.longitude, wind.times[0] - 1)).toBeNull();
	});
});

describe('traceBack', () => {
	it('goes straight upwind for 12 hours with a widening radius', () => {
		const { points, truncated, calm } = traceBack(steadyWind(5, 90), PALEMBANG, NOW);
		const far = points.at(-1)!;
		expect(points).toHaveLength(25);
		expect(far.hoursBack).toBe(12);
		expect(Math.abs(distanceKm(PALEMBANG, far) - 216)).toBeLessThan(2);
		expect(Math.abs(bearingDeg(PALEMBANG, far) - 90)).toBeLessThan(1);
		expect(Math.abs(far.radiusKm - 69)).toBeLessThan(1);
		expect(points[0]).toMatchObject({ hoursBack: 0, distanceKm: 0, radiusKm: 15 });
		expect({ truncated, calm }).toEqual({ truncated: false, calm: false });
	});

	it('stops at the east edge of the wind grid', () => {
		const { points, truncated } = traceBack(steadyWind(10, 90), { latitude: -3, longitude: 141.3 }, NOW);
		expect(truncated).toBe(true);
		expect(points.at(-1)!.hoursBack).toBeLessThan(12);
	});

	it('stops where the wind history ends', () => {
		const { points, truncated } = traceBack(steadyWind(5, 90, NOW - 6 * HOUR), PALEMBANG, NOW);
		expect(truncated).toBe(true);
		expect(points.at(-1)!.hoursBack).toBeLessThanOrEqual(6);
	});

	it('treats a path under 30 km as calm: one 50 km circle at the place', () => {
		expect(traceBack(steadyWind(0.5, 90), PALEMBANG, NOW)).toEqual({
			points: [{ ...PALEMBANG, hoursBack: 0, distanceKm: 0, radiusKm: 50 }],
			truncated: false,
			calm: true
		});
	});
});
