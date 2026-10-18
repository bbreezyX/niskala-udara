<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { ToggleGroup } from 'bits-ui';
	import { CITIES, REGIONS, type City, type RegionId } from '#lib/config/cities.ts';
	import { roundCoordinates } from '#lib/coordinates.ts';
	import { cityLocation, LocationFeed } from '#lib/client/location-feed.svelte.ts';
	import { ERROR_MESSAGES } from '#lib/format.ts';
	import CitySearch from '#lib/components/CitySearch.svelte';
	import CityCard from '#lib/components/CityCard.svelte';
	import DetailSheet from '#lib/components/DetailSheet.svelte';
	import SortFilter, { DEFAULT_FILTER, type ListFilter } from '#lib/components/SortFilter.svelte';
	import StateMessage from '#lib/components/StateMessage.svelte';
	import AboutAqi from '#lib/components/AboutAqi.svelte';
	import type { PageProps } from './$types';

	let { data: page }: PageProps = $props();

	const cityFeeds = CITIES.map((city) => new LocationFeed(cityLocation(city)));
	let deviceFeed = $state<LocationFeed | null>(null);
	let region = $state<RegionId>(REGIONS[0].id);
	// Only the active region is shown and loaded, so a page view costs one region's requests.
	const regionFeeds = $derived(cityFeeds.filter((feed) => feed.location.region === region));
	const feeds = $derived(deviceFeed ? [deviceFeed, ...regionFeeds] : regionFeeds);

	let filter = $state<ListFilter>(DEFAULT_FILTER);
	let selected = $state<LocationFeed | null>(null);
	let sheetOpen = $state(false);
	let locating = $state(false);
	let geoError = $state<string | null>(null);
	let geoRequest = 0;

	const visibleFeeds = $derived.by(() => {
		const [min, max] = filter.range;
		const aqiOf = (feed: LocationFeed) => (feed.current.status === 'success' ? feed.current.data.index.aqi : null);
		// Locations without data yet stay visible: hiding them would look like missing data.
		const list = feeds.filter((feed) => {
			const aqi = aqiOf(feed);
			return aqi === null || (aqi >= min && aqi <= max);
		});
		if (filter.sort === 'name') return list.toSorted((a, b) => a.location.name.localeCompare(b.location.name, 'id'));
		if (filter.sort === 'best' || filter.sort === 'worst') {
			const direction = filter.sort === 'best' ? -1 : 1;
			return list.toSorted((a, b) => {
				const aqiA = aqiOf(a);
				const aqiB = aqiOf(b);
				if (aqiA === null || aqiB === null) return aqiA === null ? 1 : -1;
				return (aqiA - aqiB) * direction;
			});
		}
		return list;
	});

	const anyBusy = $derived(feeds.some((feed) => feed.busy));
	const hiddenCount = $derived(feeds.length - visibleFeeds.length);

	const announcement = $derived.by(() => {
		const loading = feeds.filter((feed) => feed.current.status === 'loading').length;
		if (loading > 0) return `Memuat data ${loading} lokasi.`;
		const loaded = feeds.filter((feed) => feed.current.status === 'success').length;
		return loaded > 0 ? `Data ${loaded} lokasi dimuat.` : '';
	});

	// Load a region the first time it is shown. Only ask the server when it can answer;
	// otherwise the not-configured notice is shown.
	$effect(() => {
		if (!page.configured) return;
		for (const feed of regionFeeds) {
			if (untrack(() => feed.current.status) === 'idle') feed.load();
		}
	});

	onMount(() => {
		return () => {
			cityFeeds.forEach((feed) => feed.dispose());
			deviceFeed?.dispose();
		};
	});

	function openFeed(feed: LocationFeed) {
		selected = feed;
		sheetOpen = true;
	}

	function openCity(city: City) {
		const feed = cityFeeds.find((f) => f.location.key === `city:${city.id}`);
		if (!feed) return;
		region = city.region;
		// The region effect loads idle feeds; without a key, load anyway so the sheet shows why it is empty.
		if (feed.current.status === 'error' || !page.configured) feed.load();
		openFeed(feed);
	}

	function refreshAll() {
		if (anyBusy) return;
		feeds.forEach((feed) => feed.load());
	}

	function useMyLocation() {
		if (!('geolocation' in navigator)) {
			geoError = 'Browser ini tidak mendukung lokasi perangkat. Silakan pilih kota.';
			return;
		}
		const request = ++geoRequest;
		locating = true;
		geoError = null;

		navigator.geolocation.getCurrentPosition(
			(position) => {
				if (request !== geoRequest) return;
				locating = false;
				deviceFeed?.dispose();
				const feed = new LocationFeed({
					key: 'device',
					name: 'Lokasi saya',
					note: 'Berdasarkan lokasi perangkat',
					coordinates: roundCoordinates(position.coords),
					// The device is at the location, so its own time zone is the right one.
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
					region: null
				});
				deviceFeed = feed;
				feed.load();
				openFeed(feed);
			},
			(error) => {
				if (request !== geoRequest) return;
				locating = false;
				geoError =
					error.code === error.PERMISSION_DENIED
						? 'Izin lokasi ditolak. Kamu tetap bisa memilih kota dari daftar.'
						: 'Lokasi tidak dapat ditemukan. Coba lagi atau pilih kota dari daftar.';
			},
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
		);
	}
</script>

<svelte:head>
	<title>Niskala Udara · Kualitas udara di sekitarmu</title>
	<meta
		name="description"
		content="Pantau kualitas udara terkini, kadar polutan, prakiraan, dan rekomendasi kesehatan di kota-kota Indonesia."
	/>
</svelte:head>

<section class="hero" aria-labelledby="page-title">
	<svg class="skyline" viewBox="0 0 640 160" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
		<path
			d="M0 160V118h34V96h26v22h22V80h30v38h18V60h8V44h6v16h8v100h12V104h28v-24h20v24h16v56h14V70l14-12 14 12v90h18V92h40v68h12V30h4V12h4v18h4v130h16V100h22v-14h24v14h18v60h12V84h30v76h16V58h34v102h14V96h22v64h24V110h30v50z"
		/>
	</svg>
	<div class="container hero-inner">
		<div class="hero-text">
			<h1 id="page-title">Bagaimana udara di sekitarmu?</h1>
			<p class="lead">Cek kualitas udara di lokasi pilihanmu.</p>
		</div>
		<div class="hero-controls">
			<CitySearch cities={CITIES} onselect={openCity} />
			<button type="button" class="button button-secondary locate" disabled={locating} onclick={useMyLocation}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
					<circle cx="12" cy="12" r="7" />
					<circle cx="12" cy="12" r="2" fill="currentColor" />
					<path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
				</svg>
				{locating ? 'Mencari lokasi…' : 'Gunakan lokasi saya'}
			</button>
			{#if geoError}
				<p class="geo-error" role="alert">{geoError}</p>
			{/if}
		</div>
	</div>
</section>

<div class="container content">
	<section class="watchlist" aria-labelledby="watchlist-title">
		<div class="toolbar">
			<div class="toolbar-title">
				<h2 id="watchlist-title">
					Pantauan <span class="count">{visibleFeeds.length}</span>
				</h2>
				<ToggleGroup.Root
					type="single"
					bind:value={() => region, (next) => {
						// A single toggle group can be cleared by clicking the active item; ignore that.
						if (next) region = next as RegionId;
					}}
					class="region-switch"
					aria-label="Wilayah"
				>
					{#each REGIONS as option (option.id)}
						<ToggleGroup.Item value={option.id} class="region-item">{option.name}</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</div>
			<div class="toolbar-actions">
				<SortFilter value={filter} onapply={(next) => (filter = next)} />
				<button type="button" class="button button-secondary" disabled={anyBusy || !page.configured} onclick={refreshAll}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M20 11a8 8 0 1 0-2.3 5.7" />
						<path d="M20 4v7h-7" />
					</svg>
					{anyBusy ? 'Memperbarui…' : 'Perbarui semua'}
				</button>
			</div>
		</div>
		<p class="visually-hidden" role="status">{announcement}</p>

		{#if !page.configured}
			<StateMessage tone="error" title={ERROR_MESSAGES.not_configured.title} description={ERROR_MESSAGES.not_configured.description} />
		{:else if visibleFeeds.length === 0}
			<StateMessage title="Tidak ada lokasi dalam rentang ini" description="Ubah rentang AQI atau atur ulang filter untuk melihat semua lokasi.">
				{#snippet action()}
					<button type="button" class="button button-primary" onclick={() => (filter = DEFAULT_FILTER)}>Atur ulang filter</button>
				{/snippet}
			</StateMessage>
		{:else}
			<div class="grid">
				{#each visibleFeeds as feed (feed.location.key)}
					<CityCard {feed} onopen={openFeed} />
				{/each}
			</div>
			{#if hiddenCount > 0}
				<p class="hidden-note">
					{hiddenCount} lokasi disembunyikan oleh filter.
					<button type="button" class="link-button" onclick={() => (filter = DEFAULT_FILTER)}>Tampilkan semua</button>
				</p>
			{/if}
		{/if}
	</section>

	<AboutAqi />
</div>

<DetailSheet feed={selected} bind:open={sheetOpen} />

<style>
	.hero {
		position: relative;
		overflow: hidden;
		background: var(--color-primary-soft);
		border-bottom: 1px solid #dbeafe;
	}

	.skyline {
		position: absolute;
		right: 0;
		bottom: 0;
		width: min(640px, 70%);
		height: auto;
		fill: #dbeafe;
		pointer-events: none;
	}

	.hero-inner {
		position: relative;
		display: grid;
		gap: var(--space-3);
		padding-top: var(--space-4);
		padding-bottom: 56px;
	}

	h1 {
		font-size: var(--text-title);
		font-weight: 700;
		letter-spacing: -0.025em;
		line-height: 1.15;
	}

	.lead {
		margin-top: var(--space-1);
		color: #475569;
		font-size: var(--text-body);
	}

	.hero-controls {
		display: grid;
		gap: 12px;
		align-content: start;
	}

	.locate {
		min-height: 48px;
		border-radius: 999px;
	}

	.geo-error {
		padding: var(--space-1) var(--space-2);
		border-radius: 10px;
		background: #fef2f2;
		color: var(--color-danger);
		font-size: var(--text-body);
	}

	.content {
		display: grid;
		gap: var(--space-4);
		margin-top: -28px;
		position: relative;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: var(--space-2);
		padding: 12px 12px 12px 20px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow);
	}

	.toolbar-title {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px var(--space-2);
	}

	:global(.region-switch) {
		display: inline-flex;
		padding: 4px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface-muted);
	}

	:global(.region-item) {
		min-height: 36px;
		padding: 0 14px;
		border: 0;
		border-radius: 9px;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: var(--text-label);
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}

	:global(.region-item:hover) {
		color: var(--color-primary);
	}

	:global(.region-item[data-state='on']) {
		background: var(--color-surface);
		color: var(--color-primary);
		box-shadow: var(--shadow);
	}

	h2 {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 1.125rem;
		font-weight: 600;
	}

	.count {
		min-width: 28px;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--color-primary-soft);
		color: var(--color-primary);
		font-size: var(--text-label);
		text-align: center;
	}

	.toolbar-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
		gap: var(--space-2);
	}

	.hidden-note {
		margin-top: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.link-button {
		min-height: var(--control-height);
		padding: 0 4px;
		border: 0;
		background: none;
		color: var(--color-primary);
		font: inherit;
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}

	@media (min-width: 768px) {
		.hero-inner {
			grid-template-columns: 1fr minmax(320px, 400px);
			align-items: center;
			padding-top: 48px;
			padding-bottom: 72px;
		}

		.hero-controls {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 479px) {
		.toolbar {
			padding-left: var(--space-2);
		}

		.toolbar-actions {
			flex: 1;
		}

		/* Buttons share a row when they fit and wrap to full width when they do not. */
		.toolbar-actions > :global(*) {
			flex: 1 1 auto;
		}
	}
</style>
