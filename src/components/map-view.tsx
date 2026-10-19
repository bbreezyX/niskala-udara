'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair } from 'lucide-react';
import { roundCoordinates } from '@/lib/coordinates';
import { getJson, toRemote, type Remote } from '@/lib/client/api';
import { HotspotLayer } from '@/lib/client/hotspot-layer';
import { useGoogleMap, useMapOverlays, type MapState } from '@/lib/client/use-google-map';
import type { FireData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StateMessage } from './info-blocks';
import { useDictionary, useLocale, useLocalePath } from './locale-provider';
import { hotspotStyle, useHotspotClicks } from './map-hotspots';
import { FiresSummary, LayerControls, MapAbout } from './map-panel';

/** FIRMS hotspots for the map. A newer request aborts the one before it. */
function useFires(configured: boolean) {
	const [fires, setFires] = useState<Remote<FireData>>({ status: 'idle' });
	const controllerRef = useRef<AbortController | null>(null);

	const loadFires = useCallback(() => {
		if (!configured) return;
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setFires({ status: 'loading' });
		getJson<FireData>('/api/fires', controller.signal).then((result) => {
			if (result) setFires(toRemote(result));
		});
	}, [configured]);

	useEffect(() => {
		loadFires();
		return () => controllerRef.current?.abort();
	}, [loadFires]);

	return [fires, loadFires] as const;
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
	const [fires, loadFires] = useFires(firesConfigured);
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
	// Built once per FIRMS response, then drawn as tiles and hit-tested by clicks.
	const hotspots = useMemo(() => (fireData ? new HotspotLayer(fireData.hotspots, hotspotStyle) : null), [fireData]);
	useMapOverlays(mapState, hotspots, showHeatmap, showFires);
	useHotspotClicks(map, showFires ? hotspots : null, selectPoint);

	const failed = mapState.status === 'unconfigured' || mapState.status === 'auth' || mapState.status === 'network';

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
			<Card className="overflow-hidden rounded-2xl p-0">
				<MapError status={mapState.status} />
				<div className={failed ? 'hidden' : 'relative h-[min(70vh,680px)] min-h-90'}>
					{/* Google Maps owns this element's children, so React renders nothing inside it. */}
					<div ref={mapElement} role="region" aria-label={t.map.regionLabel} className="absolute inset-0" />
					{mapState.status === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
				</div>
			</Card>

			<Card className="gap-0 rounded-[20px] py-0">
				<FiresSummary configured={firesConfigured} fires={fires} onRetry={loadFires} />

				<Separator />
				<LayerControls
					showHeatmap={showHeatmap}
					onShowHeatmap={setShowHeatmap}
					showFires={showFires}
					onShowFires={setShowFires}
					mapReady={map !== null}
					firesConfigured={firesConfigured}
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
					<p className="text-center text-xs text-muted-foreground">{t.map.clickHint}</p>
				</section>

				<Separator />
				<MapAbout />
			</Card>
		</div>
	);
}
