import type { Wind } from '@/lib/client/wind-layer';
import { shownHotspots } from '@/lib/hotspot-encoding';
import type { Coordinates, FireData, FireGroup, Hotspot, SmokeTrace, TraceHotspot, TraceLevel, TracePoint } from '@/lib/types';

/**
 * Smoke Trace: follow the wind back from a place, widen the path into a corridor, and find the
 * fires in it. A rough estimate from a 1.5° grid of 10 m model wind, never a dispersion model.
 */
export const TRACE_HOURS = 12;
export const STEP_MINUTES = 10;
export const SAMPLE_MINUTES = 30;
/** Corridor half-width at the place, then growing with distance travelled: about ±14° either side. */
export const BASE_RADIUS_KM = 15;
export const SPREAD = 0.25;
/** A whole path shorter than this is stagnant air: no direction, just a circle around the place. */
export const CALM_PATH_KM = 30;
export const CALM_RADIUS_KM = 50;
/** Hotspots this close belong to one burning area, so a cluster is never split by a grid line. */
export const GROUP_LINK_KM = 10;
/**
 * Total corridor fire power from which smoke may be named as contributing: about 50 typical VIIRS
 * detections (median ~6 MW). Calibrated on 21 Oct 2026 live data, where the spec's starting 100 MW
 * called Tangerang, Depok and Makassar "heavy" from 13–25 small detections 40–80 km away, while real
 * haze sources upwind of Palembang and Palangka Raya were in the thousands of MW.
 */
export const HEAVY_FRP_MW = 300;

const EARTH_RADIUS_KM = 6371;
const RADIANS = Math.PI / 180;

/** Hourly wind on a regular grid: the layout of the server's wind forecast. */
export interface WindHistory {
	grid: { west: number; south: number; step: number; columns: number; rows: number };
	/** Hour starts, Unix seconds. */
	times: number[];
	/** Per grid point, per hour: m/s, and degrees the wind comes from. */
	speeds: number[][];
	directions: number[][];
}

export interface TracePath {
	points: TracePoint[];
	/** The path stopped early: it left the wind grid or ran out of wind hours. */
	truncated: boolean;
	calm: boolean;
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
	const dLat = (b.latitude - a.latitude) * RADIANS;
	const dLon = (b.longitude - a.longitude) * RADIANS;
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * RADIANS) * Math.cos(b.latitude * RADIANS) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial compass bearing from one point to another, 0 = north, clockwise. */
export function bearingDeg(from: Coordinates, to: Coordinates): number {
	const lat1 = from.latitude * RADIANS;
	const lat2 = to.latitude * RADIANS;
	const dLon = (to.longitude - from.longitude) * RADIANS;
	const y = Math.sin(dLon) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
	return (Math.atan2(y, x) / RADIANS + 360) % 360;
}

/** Wind at a place and moment: bilinear between grid points, linear between hours. Null outside either. */
export function windAtTime(wind: WindHistory, latitude: number, longitude: number, time: number): Wind | null {
	const { times, speeds, directions } = wind;
	const last = times.length - 1;
	if (last < 1 || !(time >= times[0] && time <= times[last])) return null;
	const { west, south, step, columns, rows } = wind.grid;
	const col = (longitude - west) / step;
	const row = (latitude - south) / step;
	if (!(col >= 0 && row >= 0 && col <= columns - 1 && row <= rows - 1)) return null;

	const c0 = Math.min(Math.floor(col), columns - 2);
	const r0 = Math.min(Math.floor(row), rows - 2);
	const fx = col - c0;
	const fy = row - r0;
	const i00 = r0 * columns + c0;
	const corners = [
		[i00, (1 - fx) * (1 - fy)],
		[i00 + 1, fx * (1 - fy)],
		[i00 + columns, (1 - fx) * fy],
		[i00 + columns + 1, fx * fy]
	];
	const h0 = Math.min(times.findLastIndex((t) => t <= time), last - 1);
	const ft = (time - times[h0]) / (times[h0 + 1] - times[h0]);

	let u = 0;
	let v = 0;
	for (const [hour, weight] of [[h0, 1 - ft], [h0 + 1, ft]]) {
		for (const [i, share] of corners) {
			// Directions are converted to components before mixing, so 350° and 10° average to north, not south.
			const speed = speeds[i][hour];
			const radians = directions[i][hour] * RADIANS;
			// A missing hour is unknown wind, not still air: the trace stops here and says so.
			if (!Number.isFinite(speed) || !Number.isFinite(radians)) return null;
			u += -speed * Math.sin(radians) * share * weight;
			v += -speed * Math.cos(radians) * share * weight;
		}
	}
	return { u, v };
}

const tracePoint = (at: Coordinates, hoursBack: number, distance: number): TracePoint => ({
	latitude: at.latitude,
	longitude: at.longitude,
	hoursBack,
	distanceKm: distance,
	radiusKm: BASE_RADIUS_KM + SPREAD * distance
});

/** Where the air at `origin` was over the last `hours`, stepping back against the wind. */
export function traceBack(wind: WindHistory, origin: Coordinates, startTime: number, hours = TRACE_HOURS): TracePath {
	const stepSeconds = STEP_MINUTES * 60;
	const stepsPerSample = SAMPLE_MINUTES / STEP_MINUTES;
	const totalSteps = (hours * 60) / STEP_MINUTES;
	const points = [tracePoint(origin, 0, 0)];
	let position: Coordinates = { latitude: origin.latitude, longitude: origin.longitude };
	let travelled = 0;
	let truncated = false;

	for (let step = 1; step <= totalSteps; step++) {
		const here = windAtTime(wind, position.latitude, position.longitude, startTime - (step - 1) * stepSeconds);
		if (!here) {
			truncated = true;
			break;
		}
		// Radians of arc covered per m/s of wind in one step.
		const arc = stepSeconds / 1000 / EARTH_RADIUS_KM;
		const next = {
			latitude: position.latitude - (here.v * arc) / RADIANS,
			longitude: position.longitude - (here.u * arc) / (Math.cos(position.latitude * RADIANS) * RADIANS)
		};
		travelled += distanceKm(position, next);
		position = next;
		if (step % stepsPerSample === 0) points.push(tracePoint(position, (step * STEP_MINUTES) / 60, travelled));
	}

	// A short path only means stagnant air when the wind data covered the whole span.
	if (!truncated && travelled < CALM_PATH_KM) {
		return { points: [{ ...tracePoint(origin, 0, 0), radiusKm: CALM_RADIUS_KM }], truncated: false, calm: true };
	}
	return { points, truncated, calm: false };
}

const KM_PER_DEGREE_LAT = 110.57;
const KM_PER_DEGREE_LON = 111.32;

/** The fires the traced air passed over, strongest first. Low confidence is left out, as on the map by default. */
export function corridorHotspots(path: TracePath, hotspots: readonly Hotspot[]): TraceHotspot[] {
	const { points } = path;
	// A box around the corridor first: Indonesia can have over 15,000 detections a day.
	const pad = Math.max(...points.map((point) => point.radiusKm));
	const widest = Math.max(...points.map((point) => Math.abs(point.latitude)));
	const padLat = pad / KM_PER_DEGREE_LAT;
	const padLon = pad / (KM_PER_DEGREE_LON * Math.cos((widest + padLat) * RADIANS));
	const south = Math.min(...points.map((point) => point.latitude)) - padLat;
	const north = Math.max(...points.map((point) => point.latitude)) + padLat;
	const west = Math.min(...points.map((point) => point.longitude)) - padLon;
	const east = Math.max(...points.map((point) => point.longitude)) + padLon;

	const found: TraceHotspot[] = [];
	for (const hotspot of shownHotspots(hotspots, false)) {
		const { latitude, longitude } = hotspot;
		if (latitude < south || latitude > north || longitude < west || longitude > east) continue;
		let nearest: TracePoint | null = null;
		let nearestKm = Infinity;
		for (const point of points) {
			const km = distanceKm(point, hotspot);
			if (km <= point.radiusKm && km < nearestKm) {
				nearest = point;
				nearestKm = km;
			}
		}
		if (nearest) found.push({ latitude, longitude, frp: hotspot.frp, acquiredAt: hotspot.acquiredAt, hoursBack: nearest.hoursBack });
	}
	return found.sort((a, b) => (b.frp ?? -1) - (a.frp ?? -1));
}

/** Contiguous burning areas (single-link within GROUP_LINK_KM), strongest total fire power first. */
export function groupHotspots(origin: Coordinates, hotspots: readonly TraceHotspot[]): FireGroup[] {
	const parent = hotspots.map((_, i) => i);
	const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
	// Buckets at least one link wide in both directions, so each hotspot is compared only with its
	// neighbouring buckets. A degree of longitude shrinks away from the equator, so size for the widest latitude.
	const widest = Math.max(0, ...hotspots.map((h) => Math.abs(h.latitude)));
	const size = GROUP_LINK_KM / Math.min(KM_PER_DEGREE_LAT, KM_PER_DEGREE_LON * Math.cos(widest * RADIANS));
	const buckets = new Map<string, number[]>();
	const cell = (h: TraceHotspot) => [Math.floor(h.latitude / size), Math.floor(h.longitude / size)];
	hotspots.forEach((hotspot, i) => {
		const [row, col] = cell(hotspot);
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				for (const j of buckets.get(`${row + dr}:${col + dc}`) ?? []) {
					if (distanceKm(hotspot, hotspots[j]) <= GROUP_LINK_KM) parent[root(i)] = root(j);
				}
			}
		}
		const key = `${row}:${col}`;
		const bucket = buckets.get(key);
		if (bucket) bucket.push(i);
		else buckets.set(key, [i]);
	});

	const members = new Map<number, TraceHotspot[]>();
	hotspots.forEach((hotspot, i) => {
		const group = members.get(root(i));
		if (group) group.push(hotspot);
		else members.set(root(i), [hotspot]);
	});
	return [...members.values()]
		.map((group) => {
			const totalFrp = group.reduce((sum, h) => sum + (h.frp ?? 0), 0);
			// FRP-weighted centre; without any FRP every hotspot weighs the same.
			const weight = (h: TraceHotspot) => (totalFrp > 0 ? (h.frp ?? 0) / totalFrp : 1 / group.length);
			const centre = {
				latitude: group.reduce((sum, h) => sum + h.latitude * weight(h), 0),
				longitude: group.reduce((sum, h) => sum + h.longitude * weight(h), 0)
			};
			return {
				...centre,
				count: group.length,
				totalFrp,
				distanceKm: distanceKm(origin, centre),
				bearing: bearingDeg(origin, centre),
				hoursBack: Math.min(...group.map((h) => h.hoursBack))
			};
		})
		.sort((a, b) => b.totalFrp - a.totalFrp || b.count - a.count);
}

export function traceLevel(count: number, totalFrp: number): TraceLevel {
	if (count === 0) return 'none';
	return totalFrp >= HEAVY_FRP_MW ? 'heavy' : 'light';
}

/** Distances shown to readers: 5 km steps close by, 10 km further out, so they never look surveyed. */
export function roundDistanceKm(km: number): number {
	return km < 50 ? Math.round(km / 5) * 5 : Math.round(km / 10) * 10;
}

/** Enough to draw the corridor's fires; a busy day can put thousands in it. */
export const MAX_TRACE_HOTSPOTS = 300;

export function buildSmokeTrace({
	origin,
	wind,
	windFetchedAt,
	fires,
	now
}: {
	origin: Coordinates;
	wind: WindHistory;
	windFetchedAt: string;
	fires: FireData;
	now: Date;
}): SmokeTrace {
	const path = traceBack(wind, origin, now.getTime() / 1000);
	const hotspots = corridorHotspots(path, fires.hotspots);
	const totalFrp = hotspots.reduce((sum, h) => sum + (h.frp ?? 0), 0);
	const [main] = groupHotspots(origin, hotspots);
	const end = path.points.at(-1)!;
	return {
		hours: TRACE_HOURS,
		startedAt: now.toISOString(),
		windFetchedAt,
		firesFetchedAt: fires.fetchedAt,
		missingFireSources: fires.missingSources,
		calm: path.calm,
		truncated: path.truncated,
		from: path.calm || path.points.length < 2 ? null : bearingDeg(origin, end),
		path: path.points,
		hotspots: hotspots.slice(0, MAX_TRACE_HOTSPOTS),
		count: hotspots.length,
		totalFrp,
		mainGroup: main ? { ...main, distanceKm: roundDistanceKm(main.distanceKm), hoursBack: Math.max(1, Math.round(main.hoursBack)) } : null,
		level: traceLevel(hotspots.length, totalFrp)
	};
}
