import { describe, expect, it } from 'vitest';
import { WIND_GRID } from '@/lib/config/map';
import type { Coordinates, FireData, Hotspot } from '@/lib/types';
import {
	bearingDeg,
	buildSmokeTrace,
	corridorHotspots,
	distanceKm,
	groupHotspots,
	roundDistanceKm,
	traceBack,
	traceLevel,
	windAtTime,
	type WindHistory
} from './smoke-trace';

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

/** A point `km` east (positive) or west (negative) of `from`, at the same latitude. */
const east = (from: Coordinates, km: number) => ({
	latitude: from.latitude,
	longitude: from.longitude + km / (111.32 * Math.cos((from.latitude * Math.PI) / 180))
});
const fire = (at: Coordinates, frp: number | null, confidence: Hotspot['confidence'] = 'nominal'): Hotspot => ({
	...at,
	frp,
	confidence,
	acquiredAt: '2026-10-21T05:30:00.000Z',
	satellite: 'NOAA-20'
});

describe('corridorHotspots', () => {
	const path = traceBack(steadyWind(5, 90), PALEMBANG, NOW);

	it('keeps fires inside the radius at the place and drops those just outside', () => {
		const found = corridorHotspots(path, [fire(east(PALEMBANG, -14.5), 3), fire(east(PALEMBANG, -15.5), 3)]);
		expect(found).toHaveLength(1);
	});

	it('records how long ago the air passed over the fire, and ignores low confidence', () => {
		const at = east(PALEMBANG, 100);
		const found = corridorHotspots(path, [fire(at, 12), fire(at, 40, 'low')]);
		expect(found).toHaveLength(1);
		expect(found[0].hoursBack).toBeCloseTo(5.5);
	});
});

describe('groupHotspots', () => {
	it('keeps a cluster together across a 0.1° line', () => {
		const groups = groupHotspots(PALEMBANG, [
			{ ...fire({ latitude: -3, longitude: 105.07 }, 5), hoursBack: 2 },
			{ ...fire({ latitude: -3, longitude: 105.12 }, 5), hoursBack: 2 }
		]);
		expect(groups).toHaveLength(1);
	});

	it('links hotspots just under 10 km apart where a degree of longitude is shorter', () => {
		// At 11°S a lat-sized bucket is under 10 km wide in longitude, so these two would sit two buckets apart.
		const size = 10 / 110.57;
		const first = { latitude: -11, longitude: 1170 * size - 1e-6 };
		const groups = groupHotspots(PALEMBANG, [
			{ ...fire(first, 5), hoursBack: 2 },
			{ ...fire(east(first, 9.95), 5), hoursBack: 2 }
		]);
		expect(groups).toHaveLength(1);
	});

	it('ranks by total fire power, not by how many hotspots a group has', () => {
		const strong = [0, 1, 2].map((i) => ({ ...fire(east(PALEMBANG, 150 + i), 100), hoursBack: 8 }));
		const many = Array.from({ length: 50 }, (_, i) => ({ ...fire(east(PALEMBANG, 60 + i * 0.1), 2), hoursBack: 3 }));
		const [first] = groupHotspots(PALEMBANG, [...many, ...strong]);
		expect(first).toMatchObject({ count: 3, totalFrp: 300 });
		expect(Math.abs(first.distanceKm - 151)).toBeLessThan(1);
		expect(Math.abs(first.bearing - 90)).toBeLessThan(1);
	});
});

describe('traceLevel', () => {
	it('is none without hotspots, heavy from 300 MW, and light for hotspots without FRP', () => {
		expect([traceLevel(0, 0), traceLevel(5, 299.9), traceLevel(5, 300), traceLevel(3, 0)]).toEqual(['none', 'light', 'heavy', 'light']);
	});
});

describe('roundDistanceKm', () => {
	it('rounds to 5 km under 50 km and to 10 km above', () => {
		expect([12, 43, 47.6, 52, 123, 125].map(roundDistanceKm)).toEqual([10, 45, 50, 50, 120, 130]);
	});
});

describe('buildSmokeTrace', () => {
	const fires = (hotspots: Hotspot[]): FireData => ({
		hotspots,
		windowHours: 24,
		fetchedAt: '2026-10-21T05:50:00.000Z',
		sources: ['VIIRS_NOAA20_NRT'],
		missingSources: ['VIIRS_SNPP_NRT']
	});
	const build = (hotspots: Hotspot[]) =>
		buildSmokeTrace({
			origin: PALEMBANG,
			wind: steadyWind(5, 90),
			windFetchedAt: '2026-10-21T04:00:00.000Z',
			fires: fires(hotspots),
			now: new Date(NOW * 1000)
		});

	it('reports a quiet day as level none with no group', () => {
		expect(build([])).toMatchObject({ count: 0, totalFrp: 0, level: 'none', mainGroup: null, hotspots: [], missingFireSources: ['VIIRS_SNPP_NRT'] });
	});

	it('caps the hotspots it returns but counts them all', () => {
		const many = Array.from({ length: 320 }, (_, i) => fire(east(PALEMBANG, 20 + i * 0.5), 1));
		const trace = build(many);
		expect(trace.count).toBe(320);
		expect(trace.hotspots).toHaveLength(300);
		expect(trace.level).toBe('heavy');
	});

	it('rounds the main group for display and carries the data times', () => {
		const trace = build([fire(east(PALEMBANG, 83), 40)]);
		expect(trace.mainGroup).toMatchObject({ distanceKm: 80, hoursBack: 5, count: 1 });
		expect(trace.from).toBeCloseTo(90, 0);
		expect(trace).toMatchObject({
			hours: 12,
			startedAt: '2026-10-21T06:00:00.000Z',
			windFetchedAt: '2026-10-21T04:00:00.000Z',
			firesFetchedAt: '2026-10-21T05:50:00.000Z'
		});
	});
});

describe('missing wind', () => {
	it('has no wind where a contributing hour is missing', () => {
		const wind = steadyWind(5, 90);
		const hour = wind.times.indexOf(NOW);
		wind.speeds[0][hour] = Number.NaN;
		const corner = { latitude: WIND_GRID.south, longitude: WIND_GRID.west };
		expect(windAtTime(wind, corner.latitude, corner.longitude, NOW)).toBeNull();
	});

	it('stops at missing past hours instead of calling the air calm', () => {
		const wind = steadyWind(5, 90);
		const cutoff = wind.times.indexOf(NOW - 3 * HOUR);
		for (const speeds of wind.speeds) speeds.fill(Number.NaN, 0, cutoff);
		const { points, truncated, calm } = traceBack(wind, PALEMBANG, NOW);
		expect({ truncated, calm }).toEqual({ truncated: true, calm: false });
		expect(points.at(-1)!.hoursBack).toBeLessThanOrEqual(3);
		expect(points.every((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Number.isFinite(p.distanceKm))).toBe(true);
	});
});
