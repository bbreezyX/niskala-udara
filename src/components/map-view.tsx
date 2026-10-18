'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Crosshair, RotateCw } from 'lucide-react';
import { FIRE_WINDOW_HOURS, MAP_BOUNDS, MAP_CENTER, MAP_TIME_ZONE, MAP_ZOOM } from '@/lib/config/map';
import { UAQI_GRADIENT } from '@/lib/aqi';
import { roundCoordinates } from '@/lib/coordinates';
import { getJson, toRemote, type Remote } from '@/lib/client/api';
import { loadGoogleMaps, MapsLoadError, onMapsAuthFailure } from '@/lib/client/google-maps';
import { formatDataTime, formatHour, timeZoneLabel } from '@/lib/format';
import type { FireData, Hotspot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { StateMessage } from './info-blocks';

const CONFIDENCE = {
	high: { label: 'Keyakinan tinggi', color: '#b91c1c' },
	nominal: { label: 'Keyakinan sedang', color: '#ea580c' },
	low: { label: 'Keyakinan rendah', color: '#f59e0b' }
} as const;

const LEVELS = Object.entries(CONFIDENCE) as [Hotspot['confidence'], (typeof CONFIDENCE)[Hotspot['confidence']]][];

type MapStatus = 'unconfigured' | 'loading' | 'ready' | 'network' | 'auth';

/** Built with textContent: FIRMS values never become HTML. */
function hotspotContent(hotspot: Hotspot): HTMLElement {
	const root = document.createElement('div');
	root.style.cssText = 'display:grid;gap:2px;font-family:var(--font-sans);font-size:13px;color:#0f172a';
	const title = document.createElement('p');
	title.style.cssText = 'margin:0 0 4px;font-size:14px;font-weight:600';
	title.textContent = 'Hotspot (anomali panas)';
	root.append(title);
	const rows: [string, string][] = [
		['Terdeteksi', formatDataTime(hotspot.acquiredAt, MAP_TIME_ZONE)],
		['Satelit', `${hotspot.satellite} (VIIRS)`],
		['Keyakinan', CONFIDENCE[hotspot.confidence].label.replace('Keyakinan ', '')],
		['Daya radiatif', hotspot.frp === null ? '–' : `${hotspot.frp.toLocaleString('id-ID')} MW`]
	];
	for (const [label, value] of rows) {
		const row = document.createElement('p');
		row.style.margin = '0';
		const strong = document.createElement('strong');
		strong.textContent = `${label}: `;
		row.append(strong, value);
		root.append(row);
	}
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

	// Google Maps objects are imperative handles, not UI state.
	const maps = useRef<{
		map: google.maps.Map;
		heatmap: google.maps.ImageMapType;
		fireLayer: google.maps.Data;
	} | null>(null);
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
			router.push(`/location/point#${lat},${lng}`);
		},
		[router]
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
				await loadGoogleMaps(mapsKey);
			} catch (error) {
				if (!cancelled) setMapStatus(error instanceof MapsLoadError ? error.reason : 'network');
				return;
			}
			if (cancelled) return;
			onMapsAuthFailure(() => setMapStatus('auth'));

			const { Map, ImageMapType, Data, InfoWindow } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
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

			const fireLayer = new Data();
			fireLayer.setStyle((feature) => {
				const confidence = feature.getProperty('confidence') as Hotspot['confidence'];
				return {
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						scale: confidence === 'high' ? 6 : 5,
						fillColor: CONFIDENCE[confidence].color,
						fillOpacity: 0.9,
						strokeColor: '#ffffff',
						strokeWeight: 1.5
					},
					zIndex: confidence === 'high' ? 3 : confidence === 'nominal' ? 2 : 1
				};
			});

			const infoWindow = new InfoWindow();
			listeners.push(
				fireLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
					infoWindow.setContent(hotspotContent(event.feature.getProperty('hotspot') as Hotspot));
					infoWindow.setPosition(event.latLng);
					infoWindow.open({ map });
				}),
				map.addListener('click', (event: google.maps.MapMouseEvent) => {
					infoWindow.close();
					if (event.latLng) selectPoint(event.latLng.lat(), event.latLng.lng());
				})
			);

			maps.current = { map, heatmap, fireLayer };
			setMapStatus('ready');
		})();

		return () => {
			cancelled = true;
			listeners.forEach((listener) => listener.remove());
			maps.current = null;
		};
	}, [mapsKey, selectPoint]);

	useEffect(() => {
		const current = maps.current;
		if (mapStatus !== 'ready' || !current) return;
		const overlays = current.map.overlayMapTypes;
		const index = overlays.getArray().indexOf(current.heatmap);
		if (showHeatmap && index < 0) overlays.push(current.heatmap);
		if (!showHeatmap && index >= 0) overlays.removeAt(index);
	}, [mapStatus, showHeatmap]);

	useEffect(() => {
		const current = maps.current;
		if (mapStatus !== 'ready' || !current) return;
		const layer = current.fireLayer;
		layer.forEach((feature) => layer.remove(feature));
		if (fires.status === 'success') {
			for (const hotspot of fires.data.hotspots) {
				layer.add({
					geometry: new google.maps.Data.Point({ lat: hotspot.latitude, lng: hotspot.longitude }),
					properties: { confidence: hotspot.confidence, hotspot }
				});
			}
		}
		layer.setMap(showFires ? current.map : null);
	}, [mapStatus, fires, showFires]);

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
							title="Peta belum dikonfigurasi"
							description="Key Google Maps untuk browser belum dipasang di server, jadi peta belum bisa ditampilkan."
						/>
					)}
					{mapStatus === 'auth' && (
						<StateMessage
							tone="error"
							className="border-0"
							title="Google Maps menolak key"
							description="Pastikan Maps JavaScript API aktif dan domain ini diizinkan di pembatasan key."
						/>
					)}
					{mapStatus === 'network' && (
						<StateMessage tone="error" className="border-0" title="Peta gagal dimuat" description="Periksa koneksi internetmu, lalu muat ulang halaman." />
					)}
					<div className={failed ? 'hidden' : 'relative h-[min(70vh,680px)] min-h-90'}>
						{/* Google Maps owns this element's children, so React renders nothing inside it. */}
						<div ref={mapElement} role="region" aria-label="Peta kualitas udara dan hotspot" className="absolute inset-0" />
						{mapStatus === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
					</div>
				</Card>

				{/* The hotspot count leads: it is what changes day to day. Its legend doubles as the breakdown. */}
				<Card className="gap-0 rounded-[20px] py-0">
					<section className="grid gap-3 p-5" aria-live="polite" aria-labelledby="fires-title">
						<h2 id="fires-title" className="text-sm font-semibold text-muted-foreground">
							Hotspot sekitar Jambi, {FIRE_WINDOW_HOURS} jam
						</h2>
						{!firesConfigured ? (
							<p className="text-sm text-muted-foreground">Data hotspot belum dikonfigurasi di server.</p>
						) : fires.status === 'success' ? (
							<>
								<p className="-mt-1 flex items-baseline gap-2">
									<span className="font-display text-5xl leading-none tabular-nums">{hotspots.length}</span>
									<span className="text-muted-foreground">deteksi</span>
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
											{level.label}
											<span className="ml-auto font-semibold tabular-nums">{counts[key]}</span>
										</li>
									))}
								</ul>
								<p className="text-xs text-muted-foreground">
									{latest && <>Terakhir terdeteksi {formatDataTime(latest, MAP_TIME_ZONE)}. </>}
									Diperbarui {formatHour(fires.data.fetchedAt, MAP_TIME_ZONE)} {timeZoneLabel(MAP_TIME_ZONE)}.
								</p>
								{fires.data.missingSources.length > 0 && (
									<p className="text-xs text-muted-foreground">Sebagian satelit belum tersedia, jumlah bisa lebih rendah.</p>
								)}
							</>
						) : fires.status === 'error' ? (
							<>
								<p className="text-sm font-semibold text-destructive">Data hotspot gagal dimuat.</p>
								<Button variant="outline" size="lg" className="justify-self-start" onClick={loadFires}>
									<RotateCw data-icon="inline-start" />
									Coba lagi
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
							Lapisan peta
						</h2>
						<div className="flex min-h-11 items-center justify-between gap-3">
							<Label htmlFor="layer-heatmap" className="font-semibold">
								Kualitas udara
							</Label>
							<Switch id="layer-heatmap" checked={showHeatmap} onCheckedChange={setShowHeatmap} disabled={mapStatus !== 'ready'} />
						</div>
						{/* The heatmap uses Google's continuous UAQI colors, so the legend does too. */}
						<div className="h-2 rounded-full" style={{ background: UAQI_GRADIENT }} aria-hidden="true" />
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>0, buruk</span>
							<span>100, sangat baik</span>
						</div>
						<div className="mt-2 flex min-h-11 items-center justify-between gap-3">
							<Label htmlFor="layer-fires" className="font-semibold">
								Titik hotspot
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
							Cek AQI di tengah peta
						</Button>
						<p className="text-center text-xs text-muted-foreground">Atau klik titik mana pun di peta.</p>
					</section>

					<Separator />
					<div className="grid gap-3 p-5 text-xs text-muted-foreground">
						<details className="group">
							<summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 rounded-md font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
								Tentang data ini
								<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
							</summary>
							<p className="mt-2 leading-relaxed">
								Hotspot adalah anomali panas dari satelit, belum tentu kebakaran. Awan atau asap tebal bisa menutupi titik api. Warna peta
								adalah perkiraan model per 500 m, bukan hasil alat ukur.
							</p>
						</details>
						{/* Attribution stays visible, outside the disclosure. */}
						<p className="grid gap-0.5">
							<span lang="en" translate="no">
								Source: Includes air quality data from Google
							</span>
							<span>
								Hotspot:{' '}
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
