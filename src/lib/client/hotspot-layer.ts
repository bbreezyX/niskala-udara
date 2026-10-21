import type { Hotspot } from '@/lib/types';

const TILE = 256;
const STROKE = 1.5;

export interface HotspotStyle {
	color: string;
	/** Circle radius in CSS pixels. */
	radius: number;
	/** Fill opacity, 0–1. The outline stays opaque so faded dots still stand out over the heatmap. */
	opacity: number;
	/** Higher draws on top and wins hit tests. */
	rank: number;
}

interface Point extends HotspotStyle {
	x: number;
	y: number;
	hotspot: Hotspot;
}

/** Web Mercator world coordinates (0–256 at zoom 0), the space Google's map tiles are cut from. */
export function toWorld(latitude: number, longitude: number): { x: number; y: number } {
	const sin = Math.min(Math.max(Math.sin((latitude * Math.PI) / 180), -0.9999), 0.9999);
	return {
		x: TILE * (0.5 + longitude / 360),
		y: TILE * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI))
	};
}

/**
 * Hotspots drawn into 256 px canvas tiles instead of one DOM element per point: a dozen
 * canvases for the viewport rather than a thousand, and panning only moves the tiles
 * (Google's optimization guide: render many markers as a single static element).
 */
export class HotspotLayer {
	/** Bottom to top. */
	private readonly points: Point[];

	constructor(hotspots: readonly Hotspot[], style: (hotspot: Hotspot) => HotspotStyle) {
		this.points = hotspots
			.map((hotspot) => ({ ...style(hotspot), ...toWorld(hotspot.latitude, hotspot.longitude), hotspot }))
			.sort((a, b) => a.rank - b.rank);
	}

	/** The topmost hotspot within `tolerance` CSS pixels of its edge at this zoom. */
	hit(latitude: number, longitude: number, zoom: number, tolerance: number): Hotspot | null {
		const target = toWorld(latitude, longitude);
		const scale = 2 ** zoom;
		let best: Point | null = null;
		let bestDistance = Infinity;
		for (let i = this.points.length - 1; i >= 0; i--) {
			const point = this.points[i];
			const dx = (point.x - target.x) * scale;
			const dy = (point.y - target.y) * scale;
			const distance = dx * dx + dy * dy;
			const reach = point.radius + tolerance;
			if (distance <= reach * reach && distance < bestDistance) {
				best = point;
				bestDistance = distance;
			}
		}
		return best?.hotspot ?? null;
	}

	/** Needs the Maps JavaScript API loaded. A new MapType makes the map redraw every tile. */
	toMapType(maxZoom: number): google.maps.MapType {
		const points = this.points;
		return {
			name: 'Hotspot',
			alt: 'Hotspot',
			tileSize: new google.maps.Size(TILE, TILE),
			minZoom: 0,
			maxZoom,
			projection: null,
			radius: 6378137,
			getTile(coord, zoom, ownerDocument) {
				const doc = ownerDocument ?? document;
				if (!coord) return doc.createElement('div');
				const scale = 2 ** zoom;
				const left = coord.x * TILE;
				const top = coord.y * TILE;
				const visible = points.filter((point) => {
					const margin = point.radius + STROKE;
					const x = point.x * scale - left;
					const y = point.y * scale - top;
					return x > -margin && x < TILE + margin && y > -margin && y < TILE + margin;
				});
				// Most tiles over Sumatra hold no hotspot; an empty div costs no canvas memory.
				if (visible.length === 0) return doc.createElement('div');

				const ratio = Math.min(window.devicePixelRatio || 1, 2);
				const canvas = doc.createElement('canvas');
				canvas.width = canvas.height = TILE * ratio;
				canvas.style.width = canvas.style.height = `${TILE}px`;
				const context = canvas.getContext('2d');
				if (!context) return canvas;
				context.scale(ratio, ratio);
				context.lineWidth = STROKE;
				context.strokeStyle = '#ffffff';
				for (const point of visible) {
					context.beginPath();
					context.arc(point.x * scale - left, point.y * scale - top, point.radius, 0, Math.PI * 2);
					context.globalAlpha = point.opacity;
					context.fillStyle = point.color;
					context.fill();
					context.globalAlpha = 1;
					context.stroke();
				}
				return canvas;
			},
			releaseTile() {}
		};
	}
}

/** Keeps `layers` as the map's overlays, in that order, without touching ones already in place. */
export function syncOverlays(overlays: google.maps.MVCArray<google.maps.MapType | null>, layers: google.maps.MapType[]) {
	const wanted = new Set(layers);
	for (let i = overlays.getLength() - 1; i >= 0; i--) {
		const overlay = overlays.getAt(i);
		if (!overlay || !wanted.has(overlay)) overlays.removeAt(i);
	}
	layers.forEach((layer, i) => {
		if (overlays.getAt(i) !== layer) overlays.insertAt(i, layer);
	});
}
