<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { postJson, toRemote, type Remote } from '#lib/client/api.ts';
	import type { LocationFeed } from '#lib/client/location-feed.svelte.ts';
	import { ERROR_MESSAGES, formatClock, formatDataTime, pollutantLabel } from '#lib/format.ts';
	import type { AirQualityData } from '#lib/types.ts';
	import AqiGauge from './AqiGauge.svelte';
	import Attribution from './Attribution.svelte';
	import CategoryBadge from './CategoryBadge.svelte';
	import PollutantGrid from './PollutantGrid.svelte';
	import Recommendation from './Recommendation.svelte';
	import TrendChart, { type TrendPoint } from './TrendChart.svelte';

	let { feed, open = $bindable(false) }: { feed: LocationFeed | null; open?: boolean } = $props();

	let history = $state<Remote<AirQualityData[]>>({ status: 'idle' });
	let historyVersion = $state(0);

	// Past 24 h for the open location; aborted when the sheet closes or the location changes.
	$effect(() => {
		if (!open || !feed) return;
		void historyVersion;
		const controller = new AbortController();
		history = { status: 'loading' };
		postJson<AirQualityData[]>(
			'/api/air-quality/history',
			{ ...feed.location.coordinates, hours: 24 },
			controller.signal
		).then((result) => {
			if (result) history = toRemote(result);
		});
		return () => controller.abort();
	});

	const trend = $derived.by((): TrendPoint[] => {
		const past = history.status === 'success' ? history.data : [];
		const future = feed?.forecast.status === 'success' ? feed.forecast.data : [];
		const lastPast = past.at(-1)?.dataTime;
		return [
			...past.map((h) => ({ dateTime: h.dataTime, aqi: h.index.aqi })),
			...future
				.filter((h) => !lastPast || h.dataTime > lastPast)
				.map((h) => ({ dateTime: h.dataTime, aqi: h.index.aqi, forecast: true }))
		];
	});

	function refresh() {
		if (!feed || feed.busy) return;
		feed.load();
		historyVersion++;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="ds-overlay" />
		<Dialog.Content class="ds-content">
			{#if feed}
				{@const location = feed.location}
				<header class="head">
					<div>
						<Dialog.Title class="ds-title">{location.name}</Dialog.Title>
						<Dialog.Description class="ds-description">{location.note}</Dialog.Description>
					</div>
					<div class="head-actions">
						<button type="button" class="icon-button" onclick={refresh} disabled={feed.busy} aria-label={feed.busy ? 'Memperbarui…' : 'Perbarui data'}>
							<svg class:spin={feed.busy} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M20 11a8 8 0 1 0-2.3 5.7" />
								<path d="M20 4v7h-7" />
							</svg>
						</button>
						<Dialog.Close class="icon-button ds-close" aria-label="Tutup">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
								<path d="M6 6l12 12M18 6 6 18" />
							</svg>
						</Dialog.Close>
					</div>
				</header>

				<div class="body" aria-busy={feed.busy}>
					{#if feed.current.status === 'success'}
						{@const data = feed.current.data}
						<section class="summary">
							<AqiGauge size="lg" aqi={data.index.aqi} display={data.index.aqiDisplay} color={data.index.color} />
							<div class="summary-text">
								<CategoryBadge category={data.index.category} color={data.index.color} />
								<p class="index-name">{data.index.displayName}</p>
								{#if data.index.dominantPollutant}
									<p class="dominant">Polutan dominan: <strong>{pollutantLabel(data.index.dominantPollutant)}</strong></p>
								{/if}
							</div>
						</section>

						<p class="scale">Skala 0–100. Semakin tinggi, semakin baik kualitas udaranya.</p>

						<dl class="times">
							<div>
								<dt>Waktu data</dt>
								<dd><time datetime={data.dataTime}>{formatDataTime(data.dataTime, location.timeZone)}</time></dd>
							</div>
							{#if feed.fetchedAt}
								<div>
									<dt>Diambil</dt>
									<dd><time datetime={feed.fetchedAt.toISOString()}>{formatClock(feed.fetchedAt)}</time></dd>
								</div>
							{/if}
						</dl>

						<section class="trend">
							<div class="trend-head">
								<h3>Tren AQI</h3>
								<p class="legend">
									<span class="key solid"></span>24 jam terakhir
									<span class="key dashed"></span>Prakiraan
								</p>
							</div>
							{#if trend.length > 0}
								<TrendChart
									points={trend}
									timeZone={location.timeZone}
									label="Tren AQI {location.name}, 24 jam terakhir dan prakiraan 24 jam"
								/>
							{:else if history.status === 'loading' || feed.forecast.status === 'loading'}
								<div class="skeleton-block" style:height="190px"></div>
							{:else}
								<p class="muted">Tren belum tersedia untuk lokasi ini.</p>
							{/if}
						</section>

						<PollutantGrid pollutants={data.pollutants} />
						<Recommendation text={data.generalRecommendation} />
						<Attribution />
					{:else if feed.current.status === 'error'}
						{@const message = ERROR_MESSAGES[feed.current.code]}
						<div class="error" role="alert">
							<p class="error-title">{message.title}</p>
							<p class="muted">{message.description}</p>
							<button type="button" class="button button-primary" onclick={refresh}>Coba lagi</button>
						</div>
					{:else}
						<div class="skeleton-block" style:height="128px"></div>
						<div class="skeleton-block" style:height="48px"></div>
						<div class="skeleton-block" style:height="190px"></div>
						<p class="visually-hidden">Memuat data {location.name}</p>
					{/if}
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.ds-overlay) {
		position: fixed;
		inset: 0;
		z-index: 30;
		background: rgb(15 23 42 / 0.32);
		animation: ds-fade 200ms ease;
	}

	:global(.ds-content) {
		position: fixed;
		inset: 0 0 0 auto;
		z-index: 31;
		display: flex;
		flex-direction: column;
		width: min(520px, 100vw);
		background: var(--color-bg);
		box-shadow: -12px 0 32px rgb(15 23 42 / 0.12);
		animation: ds-slide 200ms ease;
		outline: none;
	}

	@keyframes ds-fade {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-slide {
		from {
			transform: translateX(24px);
			opacity: 0;
		}
	}

	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-2);
		padding: 20px var(--space-3) var(--space-2);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	:global(.ds-title) {
		font-size: 1.375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	:global(.ds-description) {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.head-actions {
		display: flex;
		gap: var(--space-1);
	}

	.icon-button,
	:global(.ds-close) {
		display: grid;
		place-items: center;
		width: var(--control-height);
		height: var(--control-height);
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		transition: background-color var(--transition);
	}

	.icon-button:hover:not(:disabled),
	:global(.ds-close:hover) {
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}

	.icon-button:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.spin {
		animation: ds-spin 900ms linear infinite;
	}

	@keyframes ds-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.body {
		display: grid;
		align-content: start;
		gap: 20px;
		padding: var(--space-3);
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.summary-text {
		display: grid;
		justify-items: start;
		gap: 6px;
	}

	.index-name {
		color: var(--color-text-muted);
		font-size: var(--text-label);
		font-weight: 600;
	}

	.dominant {
		font-size: var(--text-body);
		color: var(--color-text-muted);
	}

	.dominant strong {
		color: var(--color-text);
	}

	.scale {
		padding: 12px var(--space-2);
		border-radius: 10px;
		background: var(--color-primary-soft);
		color: #1e3a8a;
		font-size: var(--text-label);
	}

	.times {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin: 0;
		font-size: var(--text-label);
	}

	.times dt {
		color: var(--color-text-muted);
	}

	.times dd {
		margin: 0;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.trend {
		display: grid;
		gap: 20px;
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
	}

	.trend-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-1);
	}

	h3 {
		font-size: 1rem;
		font-weight: 600;
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.key {
		width: 16px;
		height: 0;
		border-top: 2px solid var(--color-primary);
	}

	.key.dashed {
		margin-left: 8px;
		border-top-style: dashed;
		opacity: 0.75;
	}

	.muted {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.error {
		display: grid;
		justify-items: start;
		gap: var(--space-1);
		padding: var(--space-3);
		border-radius: 12px;
		background: #fef2f2;
	}

	.error-title {
		color: var(--color-danger);
		font-weight: 600;
	}
</style>
