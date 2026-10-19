import { MAP_ZOOM } from '@/lib/config/map';
import { tileInBounds } from '@/lib/tile-bounds';

const TILE = 256;

/**
 * Waits before each retry of a failed tile. Google's ImageMapType leaves a failed tile empty until the zoom level
 * changes, which showed as blank squares after a quick pan. The second wait reaches past the 10-second block of
 * the Cloudflare rate limit, the likeliest failure in production.
 */
export const RETRY_DELAYS_MS: readonly number[] = [2_000, 8_000];

/**
 * The proxy URL for a heatmap tile, or null outside the world at this zoom (the map repeats sideways) or outside
 * the area the proxy serves.
 */
export function heatmapTileUrl(x: number, y: number, zoom: number): string | null {
	const n = 2 ** zoom;
	if (x < 0 || y < 0 || x >= n || y >= n || !tileInBounds(zoom, x, y)) return null;
	return `/api/air-quality/tiles/${zoom}/${x}/${y}`;
}

/** The parts of an <img> the retry needs, so it can be tested without a DOM. */
export interface TileImage {
	src: string;
	onload: ((event: Event) => void) | null;
	onerror: ((event: Event | string) => void) | null;
}

/**
 * Loads `url` into `image`, asking again after each delay while it fails. Retries carry `?retry=n`, so the
 * browser fetches anew rather than reusing the failure (the proxy ignores the query). Returns a cancel function
 * for tiles the map drops before they finish.
 */
export function loadWithRetry(image: TileImage, url: string, onLoad: () => void, delays: readonly number[] = RETRY_DELAYS_MS): () => void {
	let attempt = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	image.onload = onLoad;
	image.onerror = () => {
		if (attempt >= delays.length) return;
		timer = setTimeout(() => {
			attempt++;
			image.src = `${url}?retry=${attempt}`;
		}, delays[attempt]);
	};
	image.src = url;
	return () => {
		clearTimeout(timer);
		image.onload = image.onerror = null;
	};
}

/** Google's UAQI heatmap as a map type whose tiles retry, in place of ImageMapType. */
export function createHeatmapType(opacity: number): google.maps.MapType {
	const cancels = new Map<Element, () => void>();
	return {
		name: 'Universal AQI',
		alt: 'Universal AQI',
		tileSize: new google.maps.Size(TILE, TILE),
		minZoom: 0,
		maxZoom: MAP_ZOOM.max,
		projection: null,
		radius: 6378137,
		getTile(coord, zoom, ownerDocument) {
			const doc = ownerDocument ?? document;
			const url = coord && heatmapTileUrl(coord.x, coord.y, zoom);
			if (!url) return doc.createElement('div');
			const image = doc.createElement('img');
			image.alt = '';
			image.width = image.height = TILE;
			image.decoding = 'async';
			image.draggable = false;
			// Hidden until loaded, so a failed attempt never shows a broken-image box.
			image.style.visibility = 'hidden';
			image.style.opacity = String(opacity);
			cancels.set(image, loadWithRetry(image, url, () => (image.style.visibility = 'visible')));
			return image;
		},
		releaseTile(tile) {
			if (!tile) return;
			cancels.get(tile)?.();
			cancels.delete(tile);
		}
	};
}
