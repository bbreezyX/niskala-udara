'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair } from 'lucide-react';
import { roundCoordinates } from '@/lib/coordinates';
import { getJson, toRemote, type Remote } from '@/lib/client/api';
import { HotspotLayer } from '@/lib/client/hotspot-layer';
import { describeWind, WindField } from '@/lib/client/wind-layer';
import { useGoogleMap, useMapOverlays, useWindOverlay, type MapState } from '@/lib/client/use-google-map';
import type { KlhkNationalData } from '@/lib/server/klhk-ispu';
import type { FireData, WindData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StateMessage } from './info-blocks';
import { useDictionary, useLocale, useLocalePath } from './locale-provider';
import { hotspotStyle, shownHotspots, useHotspotClicks } from './map-hotspots';
import { FiresSummary, LayerControls, MapAbout, type CentreWind } from './map-panel';
import { useStationLayer } from './map-stations';

/** One map data source. A newer request aborts the one before it; nothing loads while `enabled` is off. */
function useRemoteJson<T>(path: string, enabled: boolean) {
	const [remote, setRemote] = useState<Remote<T>>({ status: 'idle' });
	const controllerRef = useRef<AbortController | null>(null);

	const load = useCallback(() => {
		if (!enabled) return;
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setRemote({ status: 'loading' });
		getJson<T>(path, controller.signal).then((result) => {
			if (result) setRemote(toRemote(result));
		});
	}, [path, enabled]);

	useEffect(() => {
		load();
		return () => controllerRef.current?.abort();
	}, [load]);

	return [remote, load] as const;
}

/** The wind at the map centre, read again whenever the map comes to rest. */
function useCentreWind(map: google.maps.Map | null, field: WindField | null): CentreWind | null {
	const [centre, setCentre] = useState<CentreWind | null>(null);
	useEffect(() => {
		if (!map || !field) return;
		const read = () => {
			const point = map.getCenter();
			const wind = point && field.at(point.lat(), point.lng());
			setCentre(wind ? describeWind(wind) : null);
		};
		read();
		const listener = map.addListener('idle', read);
		return () => listener.remove();
	}, [map, field]);
	return map && field ? centre : null;
}

function MapError({ status }: { status: MapState['status'] }) {
	const t = useDictionary();
	if (status !== 'unconfigured' && status !== 'auth' && status !== 'network') return null;
	const { title, description } = t.map[status];
	return <StateMessage variant="plain" tone="error" className="border-0" title={title} description={description} />;
}

interface Props {
	mapsKey: string | null;
	firesConfigured: boolean;
}

export function MapView({ mapsKey, firesConfigured }: Props) {
	const mapElement = useRef<HTMLDivElement>(null);
	const [showHeatmap, setShowHeatmap] = useState(true);
	const [showFires, setShowFires] = useState(true);
	const [showLowConfidence, setShowLowConfidence] = useState(false);
	const [showWind, setShowWind] = useState(true);
	const [showStations, setShowStations] = useState(true);
	const [fires, loadFires] = useRemoteJson<FireData>('/api/fires', firesConfigured);
	const [wind, loadWind] = useRemoteJson<WindData>('/api/wind', true);
	const [stations, loadStations] = useRemoteJson<KlhkNationalData>('/api/klhk-ispu/stations', true);
	const router = useRouter();
	const localize = useLocalePath();
	const locale = useLocale();
	const t = useDictionary();

	// The point opens its own page. Coordinates go in the hash, which never reaches the server.
	const selectPoint = useCallback(
		(latitude: number, longitude: number) => {
			const { latitude: lat, longitude: lng } = roundCoordinates({ latitude, longitude });
			router.push(localize(`/location/point#${lat},${lng}`));
		},
		[router, localize]
	);

	const mapState = useGoogleMap(mapElement, mapsKey, locale);
	const map = mapState.status === 'ready' ? mapState.map : null;
	const fireData = fires.status === 'success' ? fires.data : null;
	// Built once per FIRMS response or filter change, then drawn as tiles and hit-tested by clicks.
	// Ages count from the fetch, the time the panel shows as updated, so dots and legend agree.
	const hotspots = useMemo(
		() =>
			fireData
				? new HotspotLayer(shownHotspots(fireData.hotspots, showLowConfidence), hotspotStyle(Date.parse(fireData.fetchedAt)))
				: null,
		[fireData, showLowConfidence]
	);
	useMapOverlays(mapState, hotspots, showHeatmap, showFires);
	useHotspotClicks(map, showFires ? hotspots : null, selectPoint);
	const windData = wind.status === 'success' ? wind.data : null;
	const windField = useMemo(() => (windData ? new WindField(windData) : null), [windData]);
	useWindOverlay(mapState, windField, showWind);
	const centreWind = useCentreWind(map, windField);
	useStationLayer(map, stations.status === 'success' ? stations.data.stations : null, showStations, selectPoint);

	const failed = mapState.status === 'unconfigured' || mapState.status === 'auth' || mapState.status === 'network';

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
			<Card className="overflow-hidden overscroll-contain rounded-2xl p-0">
				<MapError status={mapState.status} />
				<div className={failed ? 'hidden' : 'relative h-[min(70vh,680px)] min-h-90'}>
					{/* Keep scroll inside the map even at its zoom limits; Google Maps owns this element's children. */}
					<div ref={mapElement} role="region" aria-label={t.map.regionLabel} className="absolute inset-0 overflow-hidden overscroll-contain" />
					{mapState.status === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
				</div>
			</Card>

			<Card className="gap-0 rounded-[20px] py-0">
				<FiresSummary
					configured={firesConfigured}
					fires={fires}
					onRetry={loadFires}
					showLowConfidence={showLowConfidence}
					onShowLowConfidence={setShowLowConfidence}
				/>

				<Separator />
				<LayerControls
					showHeatmap={showHeatmap}
					onShowHeatmap={setShowHeatmap}
					showFires={showFires}
					onShowFires={setShowFires}
					showWind={showWind}
					onShowWind={setShowWind}
					wind={wind}
					centreWind={centreWind}
					onRetryWind={loadWind}
					mapReady={map !== null}
					firesConfigured={firesConfigured}
					showStations={showStations}
					onShowStations={setShowStations}
					stations={stations}
					onRetryStations={loadStations}
				/>

				<Separator />
				<section className="grid gap-2 p-5">
					<Button
						size="lg"
						className="h-11 rounded-full"
						disabled={!map}
						onClick={() => {
							const center = map?.getCenter();
							if (center) selectPoint(center.lat(), center.lng());
						}}
					>
						<Crosshair data-icon="inline-start" />
						{t.map.checkCenter}
					</Button>
					<p className="meta-copy text-center text-muted-foreground">{t.map.clickHint}</p>
				</section>

				<Separator />
				<MapAbout />
			</Card>
		</div>
	);
}
