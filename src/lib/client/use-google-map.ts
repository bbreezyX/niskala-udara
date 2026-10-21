'use client';

import { useEffect, useMemo, useState, type RefObject } from 'react';
import { DEFAULT_REGION } from '@/lib/config/cities';
import { MAP_BOUNDS, MAP_ZOOM, regionBounds } from '@/lib/config/map';
import type { Locale } from '@/lib/i18n/config';
import { loadGoogleMaps, MapsLoadError, onMapsAuthFailure } from './google-maps';
import { createHeatmapType } from './heatmap-tiles';
import { rememberedRegion } from './region-memory';
import { syncOverlays, type HotspotLayer } from './hotspot-layer';
import type { SmokeTrace } from '@/lib/types';
import { createSmokeTraceOverlay } from './smoke-trace-layer';
import { createWindOverlay, type WindField } from './wind-layer';

// Google Maps objects are imperative handles; they live here only while the map is usable.
export type MapState =
	| { status: 'unconfigured' | 'loading' | 'network' | 'auth' }
	| { status: 'ready'; map: google.maps.Map; heatmap: google.maps.MapType };

function createMap({ Map }: google.maps.MapsLibrary, element: HTMLElement) {
	// Open on the region this device last used, as Pantauan and Riwayat do; opening a device's own
	// location also remembers its region. Without one, the default region.
	const bounds = regionBounds(rememberedRegion() ?? DEFAULT_REGION);
	const map = new Map(element, {
		center: { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 },
		zoom: MAP_ZOOM.initial,
		minZoom: MAP_ZOOM.min,
		maxZoom: MAP_ZOOM.max,
		restriction: { latLngBounds: MAP_BOUNDS, strictBounds: false },
		mapTypeControl: false,
		streetViewControl: false,
		// Plain +/- buttons instead of the camera control, which hides zoom behind a click.
		cameraControl: false,
		zoomControl: true,
		zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
		// A km scale, for judging how far a hotspot sits from a city.
		scaleControl: true,
		clickableIcons: false,
		gestureHandling: 'greedy'
	});
	map.fitBounds(bounds, 0);

	return { map, heatmap: createHeatmapType(0.55) };
}

/** Loads the Maps API and mounts the map into `element`. Without a key it stays `unconfigured`. */
export function useGoogleMap(element: RefObject<HTMLDivElement | null>, mapsKey: string | null, locale: Locale): MapState {
	const [state, setState] = useState<MapState>(() => ({ status: mapsKey ? 'loading' : 'unconfigured' }));

	useEffect(() => {
		const node = element.current;
		if (!mapsKey || !node) return;
		let cancelled = false;

		(async () => {
			try {
				await loadGoogleMaps(mapsKey, locale);
			} catch (error) {
				if (!cancelled) setState({ status: error instanceof MapsLoadError ? error.reason : 'network' });
				return;
			}
			if (cancelled) return;
			onMapsAuthFailure(() => {
				if (!cancelled) setState({ status: 'auth' });
			});

			const library = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
			if (!cancelled) setState({ status: 'ready', ...createMap(library, node) });
		})();

		return () => {
			cancelled = true;
		};
	}, [element, mapsKey, locale]);

	return state;
}

/** Keeps the map's overlays in step with the layer switches. */
export function useMapOverlays(state: MapState, hotspots: HotspotLayer | null, showHeatmap: boolean, showFires: boolean) {
	// Toggling a switch reuses the drawn layer; only new data (or a new map) rebuilds it.
	const hotspotType = useMemo(
		() => (state.status === 'ready' && hotspots ? hotspots.toMapType(MAP_ZOOM.max) : null),
		[state, hotspots]
	);

	useEffect(() => {
		if (state.status !== 'ready') return;
		const layers = [showHeatmap ? state.heatmap : null, showFires ? hotspotType : null];
		syncOverlays(state.map.overlayMapTypes, layers.filter((layer) => layer !== null));
	}, [state, hotspotType, showHeatmap, showFires]);
}

/** Dark ink reads over both the light base map and the heatmap colours. */
const WIND_COLOR = '#1c1917';

/** Draws the wind field on the map while `show` is on; a new field replaces the old overlay. */
export function useWindOverlay(state: MapState, field: WindField | null, show: boolean) {
	useEffect(() => {
		if (state.status !== 'ready' || !field || !show) return;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const overlay = createWindOverlay(field, WIND_COLOR, reducedMotion);
		overlay.setMap(state.map);
		return () => overlay.setMap(null);
	}, [state, field, show]);
}

/** The brand primary (--primary in globals.css): red and orange already mean fire and bad air on this map. */
const TRACE_COLOR = '#13386b';

/** Draws the smoke trace's corridor while `show` is on; a new trace replaces the old overlay. */
export function useSmokeTraceOverlay(state: MapState, trace: SmokeTrace | null, show: boolean) {
	useEffect(() => {
		if (state.status !== 'ready' || !trace || !show) return;
		const overlay = createSmokeTraceOverlay(trace, TRACE_COLOR);
		overlay.setMap(state.map);
		return () => overlay.setMap(null);
	}, [state, trace, show]);
}
