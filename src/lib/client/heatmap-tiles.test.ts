import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { heatmapTileUrl, loadWithRetry, RETRY_DELAYS_MS, type TileImage } from './heatmap-tiles';

/** Records every src the retry asks for; tests fail or load it by hand. */
function fakeImage(): TileImage & { requested: string[] } {
	const requested: string[] = [];
	return {
		requested,
		onload: null,
		onerror: null,
		get src() {
			return requested.at(-1) ?? '';
		},
		set src(value: string) {
			requested.push(value);
		}
	};
}

const URL = '/api/air-quality/tiles/8/200/130';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('heatmapTileUrl', () => {
	it('builds the proxy path and skips tiles outside the world', () => {
		expect(heatmapTileUrl(200, 130, 8)).toBe(URL);
		expect(heatmapTileUrl(-1, 130, 8)).toBeNull();
		expect(heatmapTileUrl(256, 130, 8)).toBeNull();
		// Over Europe: the proxy would refuse it, so the browser does not ask.
		expect(heatmapTileUrl(128, 85, 8)).toBeNull();
	});
});

describe('loadWithRetry', () => {
	it('asks again after each delay, then gives up', () => {
		const image = fakeImage();
		loadWithRetry(image, URL, () => {});
		expect(image.requested).toEqual([URL]);

		image.onerror?.('error');
		vi.advanceTimersByTime(RETRY_DELAYS_MS[0] - 1);
		expect(image.requested).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(image.requested).toEqual([URL, `${URL}?retry=1`]);

		image.onerror?.('error');
		vi.advanceTimersByTime(RETRY_DELAYS_MS[1]);
		expect(image.requested).toEqual([URL, `${URL}?retry=1`, `${URL}?retry=2`]);

		image.onerror?.('error');
		vi.advanceTimersByTime(60_000);
		expect(image.requested).toHaveLength(3);
	});

	it('reports a load, including one that needed a retry', () => {
		const image = fakeImage();
		const onLoad = vi.fn();
		loadWithRetry(image, URL, onLoad);
		image.onerror?.('error');
		vi.advanceTimersByTime(RETRY_DELAYS_MS[0]);
		image.onload?.(new Event('load'));
		expect(onLoad).toHaveBeenCalledTimes(1);
	});

	it('stops a pending retry once the map drops the tile', () => {
		const image = fakeImage();
		const cancel = loadWithRetry(image, URL, () => {});
		image.onerror?.('error');
		cancel();
		vi.advanceTimersByTime(60_000);
		expect(image.requested).toEqual([URL]);
		expect(image.onerror).toBeNull();
	});
});
