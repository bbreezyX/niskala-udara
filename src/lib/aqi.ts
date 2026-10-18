import { Angry, Frown, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react';

/**
 * UAQI colors as returned by the API (index.color) at AQI 0, 10, 30, 40, 50, 60 and 75.
 * 75–100 was not observed in Sumatra data; the 100 stop extends the 70–75 trend.
 * Higher is better on this scale.
 */
export const UAQI_STOPS: readonly [number, string][] = [
	[0, 'rgb(128 0 0)'],
	[10, 'rgb(255 0 0)'],
	[30, 'rgb(255 140 0)'],
	[40, 'rgb(255 197 0)'],
	[50, 'rgb(250 245 3)'],
	[60, 'rgb(193 230 25)'],
	[75, 'rgb(110 198 52)'],
	[100, 'rgb(0 153 57)']
];

export const UAQI_GRADIENT = `linear-gradient(90deg, ${UAQI_STOPS.map(([at, color]) => `${color} ${at}%`).join(', ')})`;

export interface AqiBand {
	min: number;
	label: string;
	icon: LucideIcon;
	/** Dark enough for text and thin lines on white (WCAG AA). */
	ink: string;
	/** Solid band color (Google palette, close to the UAQI color) and a text color that passes AA on it. */
	fill: string;
	onFill: string;
}

/** Google's UAQI bands: Poor 0–19, Low 20–39, Moderate 40–59, Good 60–79, Excellent 80–100. */
export const AQI_BANDS: readonly AqiBand[] = [
	{ min: 0, label: 'Buruk', icon: Angry, ink: '#991b1b', fill: '#c5221f', onFill: '#ffffff' },
	{ min: 20, label: 'Rendah', icon: Frown, ink: '#c2410c', fill: '#fa7b17', onFill: '#1f1f1f' },
	{ min: 40, label: 'Sedang', icon: Meh, ink: '#a16207', fill: '#fdd663', onFill: '#3c2c00' },
	{ min: 60, label: 'Baik', icon: Smile, ink: '#4d7c0f', fill: '#a8da6b', onFill: '#1f3a00' },
	{ min: 80, label: 'Sangat baik', icon: Laugh, ink: '#15803d', fill: '#188038', onFill: '#ffffff' }
];

export function aqiBand(aqi: number): AqiBand {
	return AQI_BANDS.findLast((band) => aqi >= band.min) ?? AQI_BANDS[0];
}

/** Index into AQI_BANDS for an AQI value. */
export function aqiBandIndex(aqi: number): number {
	return Math.max(0, AQI_BANDS.findLastIndex((band) => aqi >= band.min));
}

/** A light tint of an API color for badge backgrounds, readable with dark text. */
export function tint(color: string | null, amount = 22): string {
	return color ? `color-mix(in oklab, ${color} ${amount}%, white)` : 'var(--muted)';
}
