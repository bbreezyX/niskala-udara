import { HEATMAP_FALLBACK_MAX_AGE_MS } from '@/lib/config/cache';
import { MAP_ZOOM } from '@/lib/config/map';
import { tileInBounds } from '@/lib/tile-bounds';

const TILE = 256;
/** At 256 x 256 pixels each, 64 decoded source tiles cost about 16 MiB. */
const FALLBACK_CACHE_MAX = 64;

/** Browser retries remain a last resort after the proxy's bounded upstream retry. */
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
	let active = true;
	let timer: ReturnType<typeof setTimeout> | undefined;
	image.onload = () => {
		if (!active) return;
		active = false;
		// A late success must not be replaced by a queued retry after entering the fallback cache.
		clearTimeout(timer);
		timer = undefined;
		onLoad();
	};
	image.onerror = () => {
		if (!active || timer !== undefined || attempt >= delays.length) return;
		timer = setTimeout(() => {
			timer = undefined;
			if (!active) return;
			attempt++;
			image.src = `${url}?retry=${attempt}`;
		}, delays[attempt]);
	};
	image.src = url;
	return () => {
		active = false;
		clearTimeout(timer);
		image.onload = image.onerror = null;
	};
}

interface CachedTile {
	image: HTMLImageElement;
	expiresAt: number;
	timer: ReturnType<typeof setTimeout>;
}

/** Reuses only successfully loaded Google tiles, with no extra upstream requests for previews. */
function createFallbackCache() {
	const tiles = new Map<string, CachedTile>();
	const forget = (url: string) => {
		const tile = tiles.get(url);
		if (tile) clearTimeout(tile.timer);
		tiles.delete(url);
	};
	return {
		remember(url: string, image: HTMLImageElement, expiresAt: number) {
			const remaining = expiresAt - Date.now();
			if (remaining <= 0) return;
			forget(url);
			const entry: CachedTile = {
				image,
				expiresAt,
				timer: setTimeout(() => {
					if (tiles.get(url) === entry) forget(url);
				}, remaining)
			};
			tiles.set(url, entry);
			if (tiles.size > FALLBACK_CACHE_MAX) forget(tiles.keys().next().value!);
		},
		drawParent(x: number, y: number, zoom: number, doc: Document) {
			for (let parentZoom = zoom - 1; parentZoom >= 0; parentZoom--) {
				const scale = 2 ** (zoom - parentZoom);
				const url = heatmapTileUrl(Math.floor(x / scale), Math.floor(y / scale), parentZoom);
				const tile = url ? tiles.get(url) : undefined;
				if (!tile || !url) continue;
				if (tile.expiresAt <= Date.now()) {
					forget(url);
					continue;
				}
				const canvas = doc.createElement('canvas');
				canvas.width = canvas.height = TILE;
				canvas.style.display = 'block';
				const context = canvas.getContext('2d');
				if (!context) return null;
				const width = tile.image.naturalWidth / scale;
				const height = tile.image.naturalHeight / scale;
				// Web Mercator divides each parent into a power-of-two grid at the requested zoom.
				context.drawImage(tile.image, (x % scale) * width, (y % scale) * height, width, height, 0, 0, TILE, TILE);
				tiles.delete(url);
				tiles.set(url, tile);
				return { canvas, expiresAt: tile.expiresAt };
			}
			return null;
		}
	};
}

/** Google's UAQI heatmap with cached parent previews while the requested tiles load or retry. */
export function createHeatmapType(opacity: number): google.maps.MapType {
	const cancels = new Map<Element, () => void>();
	const fallbackCache = createFallbackCache();
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
			if (!coord) return doc.createElement('div');
			const url = heatmapTileUrl(coord.x, coord.y, zoom);
			if (!url) return doc.createElement('div');
			const container = doc.createElement('div');
			Object.assign(container.style, {
				position: 'relative', width: `${TILE}px`, height: `${TILE}px`,
				overflow: 'hidden', opacity: String(opacity)
			});
			const fallback = fallbackCache.drawParent(coord.x, coord.y, zoom, doc);
			let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
			const removeFallback = () => {
				clearTimeout(fallbackTimer);
				fallback?.canvas.remove();
			};
			if (fallback) {
				container.append(fallback.canvas);
				fallbackTimer = setTimeout(removeFallback, Math.max(0, fallback.expiresAt - Date.now()));
			}
			const image = doc.createElement('img');
			image.alt = '';
			image.width = image.height = TILE;
			image.decoding = 'async';
			image.draggable = false;
			// Hidden until loaded, so a failed attempt never shows a broken-image box.
			image.style.visibility = 'hidden';
			image.style.position = 'absolute';
			image.style.inset = '0';
			container.append(image);
			// Starting before the download keeps even an HTTP-cached source inside the combined age limit.
			const expiresAt = Date.now() + HEATMAP_FALLBACK_MAX_AGE_MS;
			const cancel = loadWithRetry(image, url, () => {
				fallbackCache.remember(url, image, expiresAt);
				// Replace the preview entirely: transparent pixels must not double up the AQI colours.
				removeFallback();
				image.style.visibility = 'visible';
			});
			cancels.set(container, () => {
				cancel();
				removeFallback();
				if (!image.complete) image.removeAttribute('src');
			});
			return container;
		},
		releaseTile(tile) {
			if (!tile) return;
			cancels.get(tile)?.();
			cancels.delete(tile);
		}
	};
}
