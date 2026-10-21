import { FIRE_WINDOW_HOURS } from '@/lib/config/map';
import type { Hotspot } from '@/lib/types';

/** One colour for every hotspot: size carries intensity and opacity carries age, leaving colour to the heatmap. */
export const HOTSPOT_COLOR = '#b91c1c';

/** Fire radiative power classes in MW, smallest first. A missing FRP draws at the smallest size. */
export const INTENSITY = [
	{ key: 'small', below: 10, radius: 4 },
	{ key: 'medium', below: 50, radius: 6 },
	{ key: 'large', below: Infinity, radius: 9 }
] as const;

/** Hours since detection, newest first. Satellites pass about twice a day, so these classes keep passes apart. */
export const AGE = [
	{ below: 6, opacity: 0.9 },
	{ below: 12, opacity: 0.65 },
	{ below: FIRE_WINDOW_HOURS, opacity: 0.4 }
] as const;

/** The first class whose upper bound is above `value`; anything past the last bound falls in the last class. */
function classIndex(classes: readonly { below: number }[], value: number): number {
	const index = classes.findIndex((item) => value < item.below);
	return index < 0 ? classes.length - 1 : index;
}

export const intensityClass = (frp: number | null) => classIndex(INTENSITY, frp ?? 0);

export const ageClass = (hoursOld: number) => classIndex(AGE, hoursOld);

/** Low-confidence detections are mostly sun glint or weak heat signals, so they stay hidden unless asked for. */
export const shownHotspots = (hotspots: readonly Hotspot[], showLow: boolean) =>
	showLow ? hotspots : hotspots.filter((hotspot) => hotspot.confidence !== 'low');
