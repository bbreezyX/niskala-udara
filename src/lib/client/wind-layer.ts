import type { WindData } from '@/lib/types';
import { toWorld } from './hotspot-layer';

const TILE = 256;
/** CSS pixels a particle moves per frame for each m/s, the same at every zoom. */
const SPEED = 0.25;
/** Particles step at most this often, so SPEED, FADE and lifetimes mean the same on 60, 120 or 240 Hz screens. */
const STEP_MS = 15;
/** One particle per this many square CSS pixels. */
const DENSITY = 420;
const MAX_PARTICLES = 3000;
/** Share of the previous frame kept each frame: the trail length. */
const FADE = 0.92;
/** Trail opacity by wind speed (m/s), so calm air reads fainter than a steady blow. */
const BUCKETS = [
	{ below: 2, alpha: 0.3 },
	{ below: 4, alpha: 0.5 },
	{ below: 7, alpha: 0.72 },
	{ below: Infinity, alpha: 0.92 }
];
/** Arrow spacing in CSS pixels when motion is reduced. */
const ARROW_SPACING = 56;

export interface Wind {
	/** Eastward and northward, m/s. */
	u: number;
	v: number;
}

/** Bilinear interpolation over the WindData grid. */
export class WindField {
	constructor(private readonly data: WindData) {}

	at(latitude: number, longitude: number): Wind | null {
		const { west, south, step, columns, rows } = this.data.grid;
		const col = (longitude - west) / step;
		const row = (latitude - south) / step;
		if (!(col >= 0 && row >= 0 && col <= columns - 1 && row <= rows - 1)) return null;
		const c0 = Math.min(Math.floor(col), columns - 2);
		const r0 = Math.min(Math.floor(row), rows - 2);
		const fx = col - c0;
		const fy = row - r0;
		const i00 = r0 * columns + c0;
		const i10 = i00 + 1;
		const i01 = i00 + columns;
		const i11 = i01 + 1;
		const mix = (values: number[]) =>
			(values[i00] * (1 - fx) + values[i10] * fx) * (1 - fy) + (values[i01] * (1 - fx) + values[i11] * fx) * fy;
		return { u: mix(this.data.u), v: mix(this.data.v) };
	}
}

/** Speed in m/s and the compass bearing the wind blows toward (0 = north, clockwise). */
export function describeWind({ u, v }: Wind): { speed: number; toward: number } {
	return { speed: Math.hypot(u, v), toward: ((Math.atan2(u, v) * 180) / Math.PI + 360) % 360 };
}

function toLatLng(x: number, y: number): { latitude: number; longitude: number } {
	return {
		longitude: (x / TILE) * 360 - 180,
		latitude: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / TILE))) * 180) / Math.PI
	};
}

/**
 * Wind as moving particle trails, like a flow map: each particle drifts with the interpolated
 * wind and fades out. Particles live in world coordinates, so they stay on the ground while the
 * map pans, and the canvas shifts its trails by the same amount. With reduced motion the layer
 * draws still arrows instead. Needs the Maps JavaScript API loaded.
 */
export function createWindOverlay(field: WindField, color: string, reducedMotion: boolean): google.maps.OverlayView {
	class WindOverlay extends google.maps.OverlayView {
		private readonly canvas = document.createElement('canvas');
		private readonly context = this.canvas.getContext('2d');
		private frame = 0;
		private lastStep = 0;
		private ratio = 1;
		private width = 0;
		private height = 0;
		/** Viewport top-left in world coordinates and the zoom it was drawn at. */
		private origin: { x: number; y: number; zoom: number } | null = null;
		private xs = new Float32Array(0);
		private ys = new Float32Array(0);
		private ages = new Uint16Array(0);
		private lifetimes = new Uint16Array(0);

		onAdd() {
			this.canvas.style.position = 'absolute';
			this.canvas.style.pointerEvents = 'none';
			this.canvas.setAttribute('aria-hidden', 'true');
			this.getPanes()?.overlayLayer.append(this.canvas);
			if (!reducedMotion) this.frame = requestAnimationFrame(this.tick);
		}

		onRemove() {
			cancelAnimationFrame(this.frame);
			this.canvas.remove();
		}

		/** Google calls this on every pan and zoom step, so the canvas never lags a frame behind. */
		draw() {
			if (this.place() && reducedMotion) this.drawArrows();
		}

		// The canvas follows the map every frame; the particles advance on a ~60 fps clock.
		private readonly tick = (time: number) => {
			this.frame = requestAnimationFrame(this.tick);
			if (!this.place() || time - this.lastStep < STEP_MS) return;
			this.lastStep = time;
			this.step();
		};

		/** Pins the canvas to the map's viewport. False while the map cannot be drawn yet. */
		private place(): boolean {
			const projection = this.getProjection();
			const map = this.getMap();
			const context = this.context;
			if (!projection || !(map instanceof google.maps.Map) || !context) return false;
			const zoom = map.getZoom();
			const topLeft = projection.fromContainerPixelToLatLng(new google.maps.Point(0, 0));
			const div = map.getDiv();
			if (zoom === undefined || !topLeft || div.clientWidth === 0) return false;

			// The overlay pane moves while dragging; translating to the viewport's corner undoes that.
			const corner = projection.fromLatLngToDivPixel(topLeft);
			if (corner) this.canvas.style.transform = `translate(${corner.x}px, ${corner.y}px)`;

			const ratio = Math.min(window.devicePixelRatio || 1, 2);
			let last = this.origin;
			if (div.clientWidth !== this.width || div.clientHeight !== this.height || ratio !== this.ratio) {
				// Resizing a canvas clears it.
				this.width = div.clientWidth;
				this.height = div.clientHeight;
				this.ratio = ratio;
				this.canvas.width = this.width * ratio;
				this.canvas.height = this.height * ratio;
				this.canvas.style.width = `${this.width}px`;
				this.canvas.style.height = `${this.height}px`;
				last = null;
			}

			const world = toWorld(topLeft.lat(), topLeft.lng());
			this.origin = { ...world, zoom };
			if (!last || last.zoom !== zoom) {
				context.setTransform(1, 0, 0, 1, 0, 0);
				context.clearRect(0, 0, this.canvas.width, this.canvas.height);
				if (!reducedMotion) this.seed();
			} else if (last.x !== world.x || last.y !== world.y) {
				// Panned: move the existing trails with the ground.
				const scale = 2 ** zoom * ratio;
				context.setTransform(1, 0, 0, 1, 0, 0);
				context.globalCompositeOperation = 'copy';
				context.drawImage(this.canvas, (last.x - world.x) * scale, (last.y - world.y) * scale);
				context.globalCompositeOperation = 'source-over';
			}
			return true;
		}

		private seed() {
			const count = Math.min(MAX_PARTICLES, Math.round((this.width * this.height) / DENSITY));
			this.xs = new Float32Array(count);
			this.ys = new Float32Array(count);
			this.ages = new Uint16Array(count);
			this.lifetimes = new Uint16Array(count);
			for (let i = 0; i < count; i++) this.spawn(i, true);
		}

		/** A new particle somewhere in the viewport; at start its age is spread so they don't fade in step. */
		private spawn(i: number, scatter: boolean) {
			const origin = this.origin;
			const scale = origin ? 2 ** origin.zoom : 1;
			this.xs[i] = (origin?.x ?? 0) + (Math.random() * this.width) / scale;
			this.ys[i] = (origin?.y ?? 0) + (Math.random() * this.height) / scale;
			this.lifetimes[i] = 60 + Math.floor(Math.random() * 80);
			this.ages[i] = scatter ? Math.floor(Math.random() * this.lifetimes[i]) : 0;
		}

		private step() {
			const context = this.context!;
			const origin = this.origin!;
			const scale = 2 ** origin.zoom;
			const ratio = this.ratio;

			context.setTransform(1, 0, 0, 1, 0, 0);
			context.globalCompositeOperation = 'destination-in';
			context.fillStyle = `rgba(0, 0, 0, ${FADE})`;
			context.fillRect(0, 0, this.canvas.width, this.canvas.height);
			context.globalCompositeOperation = 'source-over';
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
			context.strokeStyle = color;
			context.lineWidth = 1.25;
			context.lineCap = 'round';

			const paths = BUCKETS.map(() => new Path2D());
			for (let i = 0; i < this.xs.length; i++) {
				const x = this.xs[i];
				const y = this.ys[i];
				const { latitude, longitude } = toLatLng(x, y);
				const wind = field.at(latitude, longitude);
				const px = (x - origin.x) * scale;
				const py = (y - origin.y) * scale;
				const outside = px < 0 || py < 0 || px > this.width || py > this.height;
				if (!wind || outside || ++this.ages[i] > this.lifetimes[i]) {
					this.spawn(i, false);
					continue;
				}
				// Web Mercator is conformal, so one pixel step works for both axes; y grows southward.
				const nx = x + (wind.u * SPEED) / scale;
				const ny = y - (wind.v * SPEED) / scale;
				const speed = Math.hypot(wind.u, wind.v);
				const path = paths[BUCKETS.findIndex((bucket) => speed < bucket.below)];
				path.moveTo(px, py);
				path.lineTo((nx - origin.x) * scale, (ny - origin.y) * scale);
				this.xs[i] = nx;
				this.ys[i] = ny;
			}
			paths.forEach((path, i) => {
				context.globalAlpha = BUCKETS[i].alpha;
				context.stroke(path);
			});
			context.globalAlpha = 1;
		}

		private drawArrows() {
			const context = this.context!;
			const origin = this.origin!;
			const scale = 2 ** origin.zoom;
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
			context.strokeStyle = color;
			context.lineWidth = 1.5;
			context.lineCap = 'round';
			context.globalAlpha = 0.8;
			context.beginPath();
			for (let py = ARROW_SPACING / 2; py < this.height; py += ARROW_SPACING) {
				for (let px = ARROW_SPACING / 2; px < this.width; px += ARROW_SPACING) {
					const { latitude, longitude } = toLatLng(origin.x + px / scale, origin.y + py / scale);
					const wind = field.at(latitude, longitude);
					if (!wind) continue;
					const speed = Math.hypot(wind.u, wind.v);
					if (speed < 0.3) continue;
					const length = Math.min(22, 6 + speed * 2.5);
					// Screen direction of travel: east is +x, north is -y.
					const dx = wind.u / speed;
					const dy = -wind.v / speed;
					const tipX = px + (dx * length) / 2;
					const tipY = py + (dy * length) / 2;
					context.moveTo(px - (dx * length) / 2, py - (dy * length) / 2);
					context.lineTo(tipX, tipY);
					// Arrowhead: two short strokes back from the tip, 30° either side.
					for (const side of [-1, 1]) {
						const angle = Math.atan2(dy, dx) + Math.PI + (side * Math.PI) / 6;
						context.moveTo(tipX, tipY);
						context.lineTo(tipX + Math.cos(angle) * 5, tipY + Math.sin(angle) * 5);
					}
				}
			}
			context.stroke();
			context.globalAlpha = 1;
		}
	}
	return new WindOverlay();
}
