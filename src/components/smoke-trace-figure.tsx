'use client';

import { AGE, ageClass, HOTSPOT_COLOR, INTENSITY, intensityClass } from '@/lib/hotspot-encoding';
import type { Coordinates, SmokeTrace } from '@/lib/types';
import { useDictionary } from './locale-provider';

/** Drawing units; the SVG scales to its column. */
const SIZE = 280;
const MARGIN = 18;
const RINGS_KM = [25, 50, 100, 200, 400];

/**
 * The trace around the place, north up, without a basemap: a map here would be a billed Google map load
 * on every location page. Decorative for screen readers; the card's sentence and facts say the same.
 */
export function SmokeTraceFigure({ trace }: { trace: SmokeTrace }) {
	const t = useDictionary();
	const origin = trace.path[0];
	const cos = Math.cos((origin.latitude * Math.PI) / 180);
	// Local equirectangular projection in km: accurate enough over a few hundred km near the equator.
	const km = (p: Coordinates) => ({ x: (p.longitude - origin.longitude) * 111.32 * cos, y: -(p.latitude - origin.latitude) * 110.57 });
	const extent = Math.max(
		30,
		...trace.path.map((p) => Math.hypot(km(p).x, km(p).y) + p.radiusKm),
		...trace.hotspots.map((h) => Math.hypot(km(h).x, km(h).y))
	);
	const scale = (SIZE / 2 - MARGIN) / extent;
	const at = (p: Coordinates) => ({ x: km(p).x * scale, y: km(p).y * scale });
	const rings = RINGS_KM.filter((ring) => ring <= extent).slice(-2);
	const firesAt = Date.parse(trace.firesFetchedAt);
	// Older and weaker first, so fresh, strong fires sit on top.
	const hotspots = trace.hotspots.toSorted((a, b) => Date.parse(a.acquiredAt) - Date.parse(b.acquiredAt) || (a.frp ?? 0) - (b.frp ?? 0));

	return (
		<svg viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`} className="w-full max-w-[22rem] justify-self-center text-primary" aria-hidden="true">
			{rings.map((ring) => (
				<g key={ring}>
					<circle r={ring * scale} fill="none" className="stroke-border" strokeWidth={1} />
					<text y={-ring * scale - 4} textAnchor="middle" fontSize={11} className="fill-muted-foreground tabular-nums">
						{ring} km
					</text>
				</g>
			))}
			{/* One group with one opacity, so overlapping circles read as a single corridor. */}
			<g fill="currentColor" opacity={0.15}>
				{trace.path.map((p) => (
					<circle key={p.hoursBack} cx={at(p).x} cy={at(p).y} r={p.radiusKm * scale} />
				))}
			</g>
			{trace.path.length > 1 && (
				<polyline
					points={trace.path.map((p) => `${at(p).x},${at(p).y}`).join(' ')}
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					strokeDasharray="4 3"
					strokeLinecap="round"
				/>
			)}
			{hotspots.map((h, i) => (
				<circle
					key={i}
					cx={at(h).x}
					cy={at(h).y}
					r={INTENSITY[intensityClass(h.frp)].radius}
					fill={HOTSPOT_COLOR}
					fillOpacity={AGE[ageClass((firesAt - Date.parse(h.acquiredAt)) / 3_600_000)].opacity}
					stroke="#ffffff"
					strokeWidth={1.5}
				/>
			))}
			<circle r={4.5} className="fill-foreground" stroke="#ffffff" strokeWidth={2} />
			<g transform={`translate(${SIZE / 2 - 14} ${-SIZE / 2 + 12})`} className="fill-muted-foreground stroke-muted-foreground">
				<path d="M0 10 L0 0 M-3.5 4 L0 0 L3.5 4" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
				<text y={22} textAnchor="middle" fontSize={11} stroke="none" className="font-semibold">
					{t.smokeTrace.north}
				</text>
			</g>
		</svg>
	);
}
