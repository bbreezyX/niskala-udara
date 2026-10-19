'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Crosshair, RotateCw } from 'lucide-react';
import { FIRE_WINDOW_HOURS, MAP_BOUNDS, MAP_CENTER, MAP_TIME_ZONE, MAP_ZOOM } from '@/lib/config/map';
import { UAQI_GRADIENT } from '@/lib/aqi';
import { roundCoordinates } from '@/lib/coordinates';
import { getJson, toRemote, type Remote } from '@/lib/client/api';
import { loadGoogleMaps, MapsLoadError, onMapsAuthFailure } from '@/lib/client/google-maps';
import { HotspotLayer, syncOverlays, type HotspotStyle } from '@/lib/client/hotspot-layer';
import { formatAgo, formatDataTime, formatHour, numberFormat, timeZoneLabel } from '@/lib/format';
import { fill, plural, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import type { FireData, Hotspot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { StateMessage } from './info-blocks';
import { useDictionary, useLocale, useLocalePath } from './locale-provider';

const CONFIDENCE = {
	high: { color: '#b91c1c' },
	nominal: { color: '#ea580c' },
	low: { color: '#f59e0b' }
} as const;

const LEVELS = Object.entries(CONFIDENCE) as [Hotspot['confidence'], (typeof CONFIDENCE)[Hotspot['confidence']]][];

const RANK = { low: 1, nominal: 2, high: 3 } as const;

const hotspotStyle = ({ confidence }: Hotspot): HotspotStyle => ({
	color: CONFIDENCE[confidence].color,
	radius: confidence === 'high' ? 6 : 5,
	rank: RANK[confidence]
});

type MapStatus = 'unconfigured' | 'loading' | 'ready' | 'network' | 'auth';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
}

/**
 * Hotspot details for the InfoWindow, styled by `.hotspot-card` in globals.css.
 * Built with textContent: FIRMS values never become HTML.
 */
function hotspotContent(hotspot: Hotspot, locale: Locale, t: Dictionary['map'], onCheck: () => void): HTMLElement {
	const level = CONFIDENCE[hotspot.confidence];
	const root = element('div', 'hotspot-card');

	const chip = element('p', 'hotspot-card__level', t.confidence[hotspot.confidence]);
	chip.style.setProperty('--level', level.color);

	// Recency leads: a fire seen an hour ago matters more than one from yesterday.
	const time = element('time', 'hotspot-card__time');
	time.dateTime = hotspot.acquiredAt;
	time.append(
		element('span', 'hotspot-card__ago', formatAgo(hotspot.acquiredAt, locale)),
		element('span', 'hotspot-card__date', formatDataTime(hotspot.acquiredAt, MAP_TIME_ZONE, locale))
	);

	const facts = element('dl', 'hotspot-card__facts');
	const rows: [string, string][] = [
		[t.card.satellite, hotspot.satellite],
		[t.card.intensity, hotspot.frp === null ? '–' : `${numberFormat(locale, 1).format(hotspot.frp)} MW`]
	];
	for (const [label, value] of rows) facts.append(element('dt', '', label), element('dd', '', value));

	// A click on a hotspot opens this card instead of the point page, so the card offers it.
	const action = element('button', 'hotspot-card__action', t.card.check);
	action.type = 'button';
	action.addEventListener('click', onCheck);

	root.append(chip, time, facts, action);
	return root;
}

interface Props {
	mapsKey: string | null;
	firesConfigured: boolean;
}

export function MapView({ mapsKey, firesConfigured }: Props) {
	const mapElement = useRef<HTMLDivElement>(null);
	const [mapStatus, setMapStatus] = useState<MapStatus>(mapsKey ? 'loading' : 'unconfigured');
	const [showHeatmap, setShowHeatmap] = useState(true);
	const [showFires, setShowFires] = useState(true);
	const [fires, setFires] = useState<Remote<FireData>>({ status: 'idle' });
	const router = useRouter();
	const localize = useLocalePath();
	const locale = useLocale();
	const t = useDictionary();

	// Google Maps objects are imperative handles, not UI state.
	const maps = useRef<{
		map: google.maps.Map;
		heatmap: google.maps.ImageMapType;
	} | null>(null);
	// Built once per FIRMS response; activeHotspots is null while the layer is hidden, so clicks ignore it.
	const hotspotLayer = useRef<{ data: FireData; layer: HotspotLayer; mapType: google.maps.MapType } | null>(null);
	const activeHotspots = useRef<HotspotLayer | null>(null);
	const firesController = useRef<AbortController | null>(null);

	const loadFires = useCallback(() => {
		if (!firesConfigured) return;
		firesController.current?.abort();
		const controller = new AbortController();
		firesController.current = controller;
		setFires({ status: 'loading' });
		getJson<FireData>('/api/fires', controller.signal).then((result) => {
			if (result) setFires(toRemote(result));
		});
	}, [firesConfigured]);

	// The point opens its own page. Coordinates go in the hash, which never reaches the server.
	const selectPoint = useCallback(
		(latitude: number, longitude: number) => {
			const { latitude: lat, longitude: lng } = roundCoordinates({ latitude, longitude });
			router.push(localize(`/location/point#${lat},${lng}`));
		},
		[router, localize]
	);

	useEffect(() => {
		loadFires();
		return () => firesController.current?.abort();
	}, [loadFires]);

	useEffect(() => {
		if (!mapsKey || !mapElement.current) return;
		const element = mapElement.current;
		let cancelled = false;
		const listeners: google.maps.MapsEventListener[] = [];

		(async () => {
			try {
				await loadGoogleMaps(mapsKey, locale);
			} catch (error) {
				if (!cancelled) setMapStatus(error instanceof MapsLoadError ? error.reason : 'network');
				return;
			}
			if (cancelled) return;
			onMapsAuthFailure(() => setMapStatus('auth'));

			const { Map, ImageMapType, InfoWindow } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
			if (cancelled) return;
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

			// Hotspots are pixels on canvas tiles, so the map click finds them by distance.
			// Coarse pointers get a larger reach, closer to a 44 px touch target.
			const tolerance = window.matchMedia('(pointer: coarse)').matches ? 12 : 4;
			const hotspotAt = (latLng: google.maps.LatLng) =>
				activeHotspots.current?.hit(latLng.lat(), latLng.lng(), map.getZoom() ?? MAP_ZOOM.initial, tolerance) ?? null;

			const infoWindow = new InfoWindow({
				headerContent: Object.assign(document.createElement('h3'), { className: 'hotspot-card__title', textContent: t.map.card.title }),
				maxWidth: 280,
				// Lift the tail off the dot so the circle stays visible.
				pixelOffset: new google.maps.Size(0, -6)
			});
			let pointer = false;
			listeners.push(
				map.addListener('click', (event: google.maps.MapMouseEvent) => {
					if (!event.latLng) return;
					const hotspot = hotspotAt(event.latLng);
					if (hotspot) {
						infoWindow.setContent(
							hotspotContent(hotspot, locale, t.map, () => {
								infoWindow.close();
								selectPoint(hotspot.latitude, hotspot.longitude);
							})
						);
						infoWindow.setPosition({ lat: hotspot.latitude, lng: hotspot.longitude });
						infoWindow.open({ map });
						return;
					}
					infoWindow.close();
					selectPoint(event.latLng.lat(), event.latLng.lng());
				}),
				map.addListener('mousemove', (event: google.maps.MapMouseEvent) => {
					const over = Boolean(event.latLng && hotspotAt(event.latLng));
					if (over === pointer) return;
					pointer = over;
					map.setOptions({ draggableCursor: over ? 'pointer' : null });
				})
			);

			maps.current = { map, heatmap };
			setMapStatus('ready');
		})();

		return () => {
			cancelled = true;
			listeners.forEach((listener) => listener.remove());
			maps.current = null;
			hotspotLayer.current = null;
			activeHotspots.current = null;
		};
	}, [mapsKey, selectPoint, locale, t]);

	useEffect(() => {
		const current = maps.current;
		if (mapStatus !== 'ready' || !current) return;
		const data = fires.status === 'success' ? fires.data : null;
		// Toggling a switch reuses the drawn layer; only new data rebuilds it.
		if (hotspotLayer.current?.data !== data) {
			const layer = data ? new HotspotLayer(data.hotspots, hotspotStyle) : null;
			hotspotLayer.current = data && layer ? { data, layer, mapType: layer.toMapType(MAP_ZOOM.max) } : null;
		}
		const fireLayer = showFires ? hotspotLayer.current : null;
		activeHotspots.current = fireLayer?.layer ?? null;
		const layers = [showHeatmap ? current.heatmap : null, fireLayer?.mapType ?? null];
		syncOverlays(current.map.overlayMapTypes, layers.filter((layer) => layer !== null));
	}, [mapStatus, fires, showHeatmap, showFires]);

	const hotspots = fires.status === 'success' ? fires.data.hotspots : [];
	const counts = { high: 0, nominal: 0, low: 0 };
	for (const hotspot of hotspots) counts[hotspot.confidence]++;
	const latest = hotspots[0]?.acquiredAt ?? null;
	const failed = mapStatus === 'unconfigured' || mapStatus === 'auth' || mapStatus === 'network';

	return (
		<>
			<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
				<Card className="overflow-hidden rounded-2xl p-0">
					{mapStatus === 'unconfigured' && (
						<StateMessage
							tone="error"
							className="border-0"
							title={t.map.unconfigured.title}
							description={t.map.unconfigured.description}
						/>
					)}
					{mapStatus === 'auth' && (
						<StateMessage
							tone="error"
							className="border-0"
							title={t.map.auth.title}
							description={t.map.auth.description}
						/>
					)}
					{mapStatus === 'network' && (
						<StateMessage tone="error" className="border-0" title={t.map.network.title} description={t.map.network.description} />
					)}
					<div className={failed ? 'hidden' : 'relative h-[min(70vh,680px)] min-h-90'}>
						{/* Google Maps owns this element's children, so React renders nothing inside it. */}
						<div ref={mapElement} role="region" aria-label={t.map.regionLabel} className="absolute inset-0" />
						{mapStatus === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
					</div>
				</Card>

				{/* The hotspot count leads: it is what changes day to day. Its legend doubles as the breakdown. */}
				<Card className="gap-0 rounded-[20px] py-0">
					<section className="grid gap-3 p-5" aria-live="polite" aria-labelledby="fires-title">
						<h2 id="fires-title" className="text-sm font-semibold text-muted-foreground">
							{fill(t.map.firesTitle, { n: String(FIRE_WINDOW_HOURS) })}
						</h2>
						{!firesConfigured ? (
							<p className="text-sm text-muted-foreground">{t.map.firesUnconfigured}</p>
						) : fires.status === 'success' ? (
							<>
								<p className="-mt-1 flex items-baseline gap-2">
									<span className="font-display text-5xl leading-none tabular-nums">{hotspots.length}</span>
									<span className="text-muted-foreground">{plural(t.map.detections, hotspots.length, locale)}</span>
								</p>
								{hotspots.length > 0 && (
									<div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
										{LEVELS.map(([key, level]) => (
											<span key={key} style={{ flexGrow: counts[key], background: level.color }} />
										))}
									</div>
								)}
								<ul className="grid gap-1.5 text-sm">
									{LEVELS.map(([key, level]) => (
										<li key={key} className="flex items-center gap-2">
											<span className="size-2.5 shrink-0 rounded-full" style={{ background: level.color }} aria-hidden="true" />
											{t.map.confidence[key]}
											<span className="ml-auto font-semibold tabular-nums">{counts[key]}</span>
										</li>
									))}
								</ul>
								<p className="text-xs text-muted-foreground">
									{latest && fill(t.map.lastDetected, { time: formatDataTime(latest, MAP_TIME_ZONE, locale) })}
									{fill(t.map.updated, { time: `${formatHour(fires.data.fetchedAt, MAP_TIME_ZONE, locale)} ${timeZoneLabel(MAP_TIME_ZONE)}` })}
								</p>
								{fires.data.missingSources.length > 0 && (
									<p className="text-xs text-muted-foreground">{t.map.missingSources}</p>
								)}
							</>
						) : fires.status === 'error' ? (
							<>
								<p className="text-sm font-semibold text-destructive">{t.map.firesFailed}</p>
								<Button variant="outline" size="lg" className="justify-self-start" onClick={loadFires}>
									<RotateCw data-icon="inline-start" />
									{t.common.retry}
								</Button>
							</>
						) : (
							<div className="grid gap-3">
								<Skeleton className="h-12 w-28 rounded-lg" />
								<Skeleton className="h-2 rounded-full" />
								<Skeleton className="h-16 rounded-lg" />
							</div>
						)}
					</section>

					<Separator />
					<section className="grid gap-1 p-5" aria-labelledby="layers-title">
						<h2 id="layers-title" className="sr-only">
							{t.map.layers}
						</h2>
						<div className="flex min-h-11 items-center justify-between gap-3">
							<Label htmlFor="layer-heatmap" className="font-semibold">
								{t.map.airQuality}
							</Label>
							<Switch id="layer-heatmap" checked={showHeatmap} onCheckedChange={setShowHeatmap} disabled={mapStatus !== 'ready'} />
						</div>
						{/* The heatmap uses Google's continuous UAQI colors, so the legend does too. */}
						<div className="h-2 rounded-full" style={{ background: UAQI_GRADIENT }} aria-hidden="true" />
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>{t.map.scaleLow}</span>
							<span>{t.map.scaleHigh}</span>
						</div>
						<div className="mt-2 flex min-h-11 items-center justify-between gap-3">
							<Label htmlFor="layer-fires" className="font-semibold">
								{t.map.hotspots}
							</Label>
							<Switch
								id="layer-fires"
								checked={showFires}
								onCheckedChange={setShowFires}
								disabled={mapStatus !== 'ready' || !firesConfigured}
							/>
						</div>
					</section>

					<Separator />
					<section className="grid gap-2 p-5">
						<Button
							size="lg"
							className="h-11 rounded-full"
							disabled={mapStatus !== 'ready'}
							onClick={() => {
								const center = maps.current?.map.getCenter();
								if (center) selectPoint(center.lat(), center.lng());
							}}
						>
							<Crosshair data-icon="inline-start" />
							{t.map.checkCenter}
						</Button>
						<p className="text-center text-xs text-muted-foreground">{t.map.clickHint}</p>
					</section>

					<Separator />
					<div className="grid gap-3 p-5 text-xs text-muted-foreground">
						<details className="group">
							<summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 rounded-md font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
								{t.map.about}
								<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
							</summary>
							<p className="mt-2 leading-relaxed">{t.map.aboutText}</p>
						</details>
						{/* Attribution stays visible, outside the disclosure. */}
						<p className="grid gap-0.5">
							<span lang="en" translate="no">
								Source: Includes air quality data from Google
							</span>
							<span>
								{t.map.hotspotSource}{' '}
								<a href="https://firms.modaps.eosdis.nasa.gov/" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
									NASA FIRMS
								</a>{' '}
								(LANCE/ESDIS)
							</span>
						</p>
					</div>
				</Card>
			</div>
		</>
	);
}
