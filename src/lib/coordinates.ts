import type { Coordinates } from './types';

function isLatitude(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isLongitude(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
	return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function hasExactKeys(input: Record<string, unknown>, keys: string[]): boolean {
	const actual = Object.keys(input);
	return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function toCoordinates({ latitude, longitude }: Record<string, unknown>): Coordinates | null {
	return isLatitude(latitude) && isLongitude(longitude) ? { latitude, longitude } : null;
}

/** Accepts exactly `{ latitude, longitude }` with finite numbers in range; anything else is rejected. */
export function parseCoordinates(input: unknown): Coordinates | null {
	if (!isPlainObject(input) || !hasExactKeys(input, ['latitude', 'longitude'])) return null;
	return toCoordinates(input);
}

export const HISTORY_RANGES = [24, 72] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

/** Accepts exactly `{ latitude, longitude, hours }` where hours is one of HISTORY_RANGES. */
export function parseHistoryRequest(input: unknown): { coordinates: Coordinates; hours: HistoryRange } | null {
	if (!isPlainObject(input) || !hasExactKeys(input, ['latitude', 'longitude', 'hours'])) return null;
	const coordinates = toCoordinates(input);
	const hours = HISTORY_RANGES.find((range) => range === input.hours);
	return coordinates && hours ? { coordinates, hours } : null;
}

/** Device coordinates are rounded to ~110 m: enough for air quality, less precise than the user's position. */
export function roundCoordinates({ latitude, longitude }: Coordinates): Coordinates {
	return {
		latitude: Math.round(latitude * 1000) / 1000,
		longitude: Math.round(longitude * 1000) / 1000
	};
}
