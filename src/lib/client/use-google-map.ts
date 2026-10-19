'use client';

import { useEffect, useMemo, useState, type RefObject } from 'react';
import { MAP_BOUNDS, MAP_CENTER, MAP_ZOOM } from '@/lib/config/map';
import type { Locale } from '@/lib/i18n/config';
import { loadGoogleMaps, MapsLoadError, onMapsAuthFailure } from './google-maps';
import { syncOverlays, type HotspotLayer } from './hotspot-layer';

// Google Maps objects are imperative handles; they live here only while the map is usable.
export type MapState =
	| { status: 'unconfigured' | 'loading' | 'network' | 'auth' }
	| { status: 'ready'; map: google.maps.Map; heatmap: google.maps.ImageMapType };

function createMap({ Map, ImageMapType }: google.maps.MapsLibrary, element: HTMLElement) {
	const map = new Map(element, {
		center: MAP_CENTER,
		zoom: MAP_ZOOM.initial,
		minZoom: MAP_ZOOM.min,
		maxZoom: MAP_ZOOM.max,
		restriction: { latLngBounds: MAP_BOUNDS, strictBounds: false },
		mapTypeControl: false,
		streetViewControl: false,
		clickableIcons: false,
		gestureHandling: 'greedy'
	});

	const heatmap = new ImageMapType({
		name: 'Universal AQI',
		tileSize: new google.maps.Size(256, 256),
		maxZoom: MAP_ZOOM.max,
		opacity: 0.55,
		getTileUrl: (coord, zoom) => {
			const n = 2 ** zoom;
			if (coord.x < 0 || coord.y < 0 || coord.x >= n || coord.y >= n) return null;
			return `/api/air-quality/tiles/${zoom}/${coord.x}/${coord.y}`;
		}
	});

	return { map, heatmap };
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
