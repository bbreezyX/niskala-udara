<script lang="ts">
	import { onMount } from 'svelte';
	import { Switch } from 'bits-ui';
	import { PUBLIC_GOOGLE_MAPS_API_KEY } from '$app/env/public';
	import { FIRE_WINDOW_HOURS, MAP_BOUNDS, MAP_CENTER, MAP_TIME_ZONE, MAP_ZOOM } from '#lib/config/map.ts';
	import { roundCoordinates } from '#lib/coordinates.ts';
	import { getJson, toRemote, type Remote } from '#lib/client/api.ts';
	import { loadGoogleMaps, MapsLoadError, onMapsAuthFailure } from '#lib/client/google-maps.ts';
	import { LocationFeed } from '#lib/client/location-feed.svelte.ts';
	import { formatClock, formatDataTime } from '#lib/format.ts';
	import type { FireData, Hotspot } from '#lib/types.ts';
	import DetailSheet from '#lib/components/DetailSheet.svelte';
	import StateMessage from '#lib/components/StateMessage.svelte';
	import type { PageProps } from './$types';

	let { data: page }: PageProps = $props();

	const CONFIDENCE = {
		high: { label: 'Keyakinan tinggi', color: '#b91c1c' },
		nominal: { label: 'Keyakinan sedang', color: '#ea580c' },
		low: { label: 'Keyakinan rendah', color: '#f59e0b' }
	} as const;

	let mapElement = $state<HTMLDivElement>();
	let mapStatus = $state<'unconfigured' | 'loading' | 'ready' | 'network' | 'auth'>(
		PUBLIC_GOOGLE_MAPS_API_KEY ? 'loading' : 'unconfigured'
	);
	let showHeatmap = $state(true);
	let showFires = $state(true);
	let fires = $state<Remote<FireData>>({ status: 'idle' });
	let pointFeed = $state<LocationFeed | null>(null);
	let sheetOpen = $state(false);

	// Google Maps objects are imperative handles, not UI state.
	let map: google.maps.Map | undefined;
	let heatmap: google.maps.ImageMapType | undefined;
	let fireLayer: google.maps.Data | undefined;
	let selection: google.maps.Data | undefined;
	let infoWindow: google.maps.InfoWindow | undefined;
	let firesController: AbortController | null = null;

	const counts = $derived.by(() => {
		const list = fires.status === 'success' ? fires.data.hotspots : [];
		return {
			total: list.length,
			high: list.filter((h) => h.confidence === 'high').length,
			latest: list[0]?.acquiredAt ?? null
		};
	});

	function loadFires() {
		if (!page.firesConfigured) return;
		firesController?.abort();
		const controller = new AbortController();
		firesController = controller;
		fires = { status: 'loading' };
		getJson<FireData>('/api/fires', controller.signal).then((result) => {
			if (result) fires = toRemote(result);
		});
	}

	function selectPoint(latitude: number, longitude: number) {
		const coordinates = roundCoordinates({ latitude, longitude });
		selection?.forEach((feature) => selection?.remove(feature));
		selection?.add({ geometry: new google.maps.Data.Point({ lat: coordinates.latitude, lng: coordinates.longitude }) });

		pointFeed?.dispose();
		const feed = new LocationFeed({
			key: `point:${coordinates.latitude},${coordinates.longitude}`,
			name: 'Titik dipilih',
			note: `${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)}`,
			coordinates,
			// The map is limited to Sumatra, which is entirely WIB.
			timeZone: MAP_TIME_ZONE,
			region: null
		});
		pointFeed = feed;
		feed.load();
		sheetOpen = true;
	}

	function selectCenter() {
		const center = map?.getCenter();
		if (center) selectPoint(center.lat(), center.lng());
	}

	/** Built with textContent: FIRMS values never become HTML. */
	function hotspotContent(hotspot: Hotspot): HTMLElement {
		const root = document.createElement('div');
		root.className = 'hotspot-info';
		const title = document.createElement('p');
		title.className = 'hotspot-info-title';
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
			const strong = document.createElement('strong');
			strong.textContent = `${label}: `;
			row.append(strong, value);
			root.append(row);
		}
		return root;
	}

	async function initMap() {
		if (!PUBLIC_GOOGLE_MAPS_API_KEY || !mapElement) return;
		try {
			await loadGoogleMaps(PUBLIC_GOOGLE_MAPS_API_KEY);
		} catch (error) {
			mapStatus = error instanceof MapsLoadError ? error.reason : 'network';
			return;
		}
		onMapsAuthFailure(() => (mapStatus = 'auth'));

		const { Map, ImageMapType, Data, InfoWindow } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
		map = new Map(mapElement, {
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

		heatmap = new ImageMapType({
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

		fireLayer = new Data();
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

		selection = new Data({ map });
		selection.setStyle({
			icon: {
				path: google.maps.SymbolPath.CIRCLE,
				scale: 8,
				fillColor: '#2563eb',
				fillOpacity: 1,
				strokeColor: '#ffffff',
				strokeWeight: 3
			},
			zIndex: 10
		});

		infoWindow = new InfoWindow();
		fireLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
			infoWindow?.setContent(hotspotContent(event.feature.getProperty('hotspot') as Hotspot));
			infoWindow?.setPosition(event.latLng);
			infoWindow?.open({ map });
		});
		map.addListener('click', (event: google.maps.MapMouseEvent) => {
			infoWindow?.close();
			if (event.latLng) selectPoint(event.latLng.lat(), event.latLng.lng());
		});

		mapStatus = 'ready';
	}

	onMount(() => {
		initMap();
		loadFires();
		return () => {
			firesController?.abort();
			pointFeed?.dispose();
		};
	});

	$effect(() => {
		if (mapStatus !== 'ready' || !map || !heatmap) return;
		const overlays = map.overlayMapTypes;
		const index = overlays.getArray().indexOf(heatmap);
		if (showHeatmap && index < 0) overlays.push(heatmap);
		if (!showHeatmap && index >= 0) overlays.removeAt(index);
	});

	$effect(() => {
		if (mapStatus !== 'ready' || !fireLayer) return;
		const layer = fireLayer;
		layer.forEach((feature) => layer.remove(feature));
		if (fires.status === 'success') {
			for (const hotspot of fires.data.hotspots) {
				layer.add({
					geometry: new google.maps.Data.Point({ lat: hotspot.latitude, lng: hotspot.longitude }),
					properties: { confidence: hotspot.confidence, hotspot }
				});
			}
		}
		layer.setMap(showFires ? (map ?? null) : null);
	});
</script>

<svelte:head>
	<title>Peta · Niskala Udara</title>
	<meta name="description" content="Peta kualitas udara (Universal AQI) dan hotspot kebakaran 24 jam di sekitar Provinsi Jambi." />
</svelte:head>

<div class="container page">
	<header class="intro">
		<h1>Peta udara &amp; hotspot</h1>
		<p class="lead">Klik di peta untuk melihat kualitas udara di titik itu.</p>
	</header>

	<div class="layout">
		<div class="card map-card">
			{#if mapStatus === 'unconfigured'}
				<StateMessage
					tone="error"
					title="Peta belum dikonfigurasi"
					description="Key Google Maps untuk browser belum dipasang di server, jadi peta belum bisa ditampilkan."
				/>
			{:else if mapStatus === 'auth'}
				<StateMessage
					tone="error"
					title="Google Maps menolak key"
					description="Pastikan Maps JavaScript API aktif dan domain ini diizinkan di pembatasan key."
				/>
			{:else if mapStatus === 'network'}
				<StateMessage tone="error" title="Peta gagal dimuat" description="Periksa koneksi internetmu, lalu muat ulang halaman." />
			{/if}
			<div
				class="map"
				class:hidden={mapStatus === 'unconfigured' || mapStatus === 'auth' || mapStatus === 'network'}
				bind:this={mapElement}
				aria-label="Peta kualitas udara dan hotspot"
				role="region"
			>
				{#if mapStatus === 'loading'}
					<div class="skeleton-block map-skeleton"></div>
				{/if}
			</div>
		</div>

		<aside class="card panel" aria-labelledby="layers-title">
			<section class="block">
				<h2 id="layers-title">Lapisan</h2>
				<div class="toggle">
					<Switch.Root id="layer-heatmap" bind:checked={showHeatmap} disabled={mapStatus !== 'ready'} class="switch">
						<Switch.Thumb class="switch-thumb" />
					</Switch.Root>
					<label for="layer-heatmap">Kualitas udara (Universal AQI)</label>
				</div>
				<div class="legend-bar" aria-hidden="true"></div>
				<div class="legend-scale"><span>0 · buruk</span><span>100 · baik</span></div>

				<div class="toggle">
					<Switch.Root
						id="layer-fires"
						bind:checked={showFires}
						disabled={mapStatus !== 'ready' || !page.firesConfigured}
						class="switch"
					>
						<Switch.Thumb class="switch-thumb" />
					</Switch.Root>
					<label for="layer-fires">Hotspot {FIRE_WINDOW_HOURS} jam terakhir</label>
				</div>
				<ul class="dots">
					{#each Object.values(CONFIDENCE) as level (level.label)}
						<li><span class="dot" style:background-color={level.color}></span>{level.label}</li>
					{/each}
				</ul>
			</section>

			<section class="block" aria-live="polite">
				<h2>Hotspot sekitar Jambi</h2>
				{#if !page.firesConfigured}
					<p class="muted">Data hotspot belum dikonfigurasi di server.</p>
				{:else if fires.status === 'success'}
					<p class="stat"><strong>{counts.total}</strong> deteksi dalam {fires.data.windowHours} jam</p>
					<p class="muted">{counts.high} dengan keyakinan tinggi</p>
					{#if counts.latest}
						<p class="muted">Terakhir terdeteksi {formatDataTime(counts.latest, MAP_TIME_ZONE)}</p>
					{/if}
					<p class="muted">Diambil {formatClock(new Date(fires.data.fetchedAt))}</p>
					{#if fires.data.missingSources.length > 0}
						<p class="muted">Sebagian satelit belum tersedia, jumlah bisa lebih rendah.</p>
					{/if}
				{:else if fires.status === 'error'}
					<p class="error-text">Data hotspot gagal dimuat.</p>
					<button type="button" class="button button-secondary small" onclick={loadFires}>Coba lagi</button>
				{:else}
					<div class="skeleton-block" style:height="64px"></div>
				{/if}
			</section>

			<section class="block">
				<button type="button" class="button button-primary" disabled={mapStatus !== 'ready'} onclick={selectCenter}>
					Cek AQI di tengah peta
				</button>
				<p class="muted">Bisa juga dengan klik langsung di peta.</p>
			</section>

			<section class="block notes">
				<p>
					Hotspot adalah anomali panas dari satelit, belum tentu kebakaran. Awan atau asap tebal bisa menutupi titik
					api. Warna peta adalah perkiraan model per 500 m, bukan hasil alat ukur.
				</p>
				<p class="credits">
					<span lang="en" translate="no">Source: Includes air quality data from Google</span>
					<span>
						Hotspot: <a href="https://firms.modaps.eosdis.nasa.gov/" rel="noopener noreferrer">NASA FIRMS</a> (LANCE/ESDIS)
					</span>
				</p>
			</section>
		</aside>
	</div>
</div>

<DetailSheet feed={pointFeed} bind:open={sheetOpen} />

<style>
	.page {
		display: grid;
		gap: var(--space-3);
		padding-top: var(--space-4);
	}

	h1 {
		font-size: var(--text-title);
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.lead {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
	}

	.layout {
		display: grid;
		gap: var(--space-2);
	}

	@media (min-width: 1024px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) 320px;
			align-items: start;
		}
	}

	.map-card {
		overflow: hidden;
		padding: 0;
	}

	.map {
		position: relative;
		height: min(70vh, 680px);
		min-height: 360px;
	}

	.map.hidden {
		display: none;
	}

	.map-skeleton {
		position: absolute;
		inset: 0;
		border-radius: 0;
	}

	.panel {
		display: grid;
		gap: 0;
		padding: 0;
	}

	.block {
		display: grid;
		gap: var(--space-1);
		padding: var(--space-2) 20px;
		border-bottom: 1px solid var(--color-border);
	}

	.block:last-child {
		border-bottom: 0;
	}

	h2 {
		font-size: var(--text-body);
		font-weight: 600;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--control-height);
	}

	.toggle label {
		font-size: var(--text-label);
		font-weight: 600;
		cursor: pointer;
	}

	:global(.switch) {
		display: inline-flex;
		align-items: center;
		width: 40px;
		height: 24px;
		flex-shrink: 0;
		padding: 2px;
		border: 0;
		border-radius: 999px;
		background: #cbd5e1;
		cursor: pointer;
		transition: background-color var(--transition);
	}

	:global(.switch[data-state='checked']) {
		background: var(--color-primary);
	}

	:global(.switch:disabled) {
		cursor: not-allowed;
		opacity: 0.5;
	}

	:global(.switch-thumb) {
		display: block;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 2px rgb(15 23 42 / 0.2);
		transition: transform var(--transition);
	}

	:global(.switch-thumb[data-state='checked']) {
		transform: translateX(16px);
	}

	/* Approximates Google's UAQI_RED_GREEN palette used by the tiles. */
	.legend-bar {
		height: 8px;
		border-radius: 999px;
		background: linear-gradient(90deg, #d32f2f, #f57c00, #fbc02d, #9ccc65, #2e7d32);
	}

	.legend-scale {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--space-1);
		color: var(--color-text-muted);
		font-size: 0.75rem;
	}

	.dots {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-label);
		color: var(--color-text-muted);
	}

	.dots li {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.dot {
		width: 10px;
		height: 10px;
		border: 1.5px solid #fff;
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgb(15 23 42 / 0.15);
	}

	.stat {
		font-size: var(--text-body);
	}

	.stat strong {
		font-size: 1.75rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.muted {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.error-text {
		color: var(--color-danger);
		font-size: var(--text-label);
		font-weight: 600;
	}

	.small {
		justify-self: start;
		min-height: 40px;
	}

	.notes {
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.credits {
		display: grid;
		gap: 2px;
		color: #5e5e5e;
	}

	:global(.hotspot-info) {
		display: grid;
		gap: 2px;
		font-family: var(--font-sans);
		font-size: 0.8125rem;
		color: var(--color-text);
	}

	:global(.hotspot-info-title) {
		margin-bottom: 4px;
		font-size: 0.875rem;
		font-weight: 600;
	}
</style>
