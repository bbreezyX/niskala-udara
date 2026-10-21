import type { Wind } from '@/lib/client/wind-layer';
import type { Coordinates, TracePoint } from '@/lib/types';

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
