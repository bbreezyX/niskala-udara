import type { SmokeTrace } from '@/lib/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Km per degree of latitude, for turning a corridor radius into pixels. */
const KM_PER_DEGREE_LAT = 110.57;

function svgElement(tag: string, attributes: Record<string, string | number>): SVGElement {
	const node = document.createElementNS(SVG_NS, tag);
	for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
	return node;
}

/**
 * A smoke trace's corridor and wind path over the map: one SVG in the overlay pane, redrawn on every pan
 * and zoom step from the map's projection. Needs the Maps JavaScript API loaded.
 */
export function createSmokeTraceOverlay(trace: SmokeTrace, color: string): google.maps.OverlayView {
	class SmokeTraceOverlay extends google.maps.OverlayView {
		private readonly svg = svgElement('svg', { 'aria-hidden': 'true', width: 1, height: 1 });

		onAdd() {
			Object.assign(this.svg.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible', pointerEvents: 'none' });
			this.getPanes()?.overlayLayer.append(this.svg);
		}

		onRemove() {
			this.svg.remove();
		}

		draw() {
			const projection = this.getProjection();
			if (!projection) return;
			const pixel = (latitude: number, longitude: number) => projection.fromLatLngToDivPixel(new google.maps.LatLng(latitude, longitude));
			const points = trace.path.flatMap((point) => {
				const centre = pixel(point.latitude, point.longitude);
				const edge = pixel(point.latitude + point.radiusKm / KM_PER_DEGREE_LAT, point.longitude);
				return centre && edge ? [{ x: centre.x, y: centre.y, r: Math.abs(centre.y - edge.y) }] : [];
			});

			// One group with one opacity, so overlapping circles read as a single corridor.
			const corridor = svgElement('g', { fill: color, opacity: 0.16 });
			for (const { x, y, r } of points) corridor.append(svgElement('circle', { cx: x, cy: y, r }));
			const children: SVGElement[] = [corridor];
			if (points.length > 1) {
				children.push(
					svgElement('polyline', {
						points: points.map(({ x, y }) => `${x},${y}`).join(' '),
						fill: 'none',
						stroke: color,
						'stroke-width': 2,
						'stroke-dasharray': '6 4',
						'stroke-linecap': 'round'
					})
				);
			}
			this.svg.replaceChildren(...children);
		}
	}
	return new SmokeTraceOverlay();
}
