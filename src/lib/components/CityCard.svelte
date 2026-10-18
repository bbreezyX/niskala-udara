<script lang="ts">
	import type { LocationFeed } from '#lib/client/location-feed.svelte.ts';
	import { ERROR_MESSAGES, formatConcentration, formatHour, POLLUTANT_LABELS, timeZoneLabel, unitLabel } from '#lib/format.ts';
	import type { PollutantCode } from '#lib/types.ts';
	import AqiGauge from './AqiGauge.svelte';
	import CategoryBadge from './CategoryBadge.svelte';
	import TrendChart from './TrendChart.svelte';

	let { feed, onopen }: { feed: LocationFeed; onopen: (feed: LocationFeed) => void } = $props();

	const SUMMARY_POLLUTANTS: PollutantCode[] = ['pm25', 'pm10', 'no2', 'o3'];
	const location = $derived(feed.location);
</script>

<article class="card city" aria-busy={feed.busy} aria-labelledby="city-{location.key}">
	{#if feed.current.status === 'success'}
		{@const { index, pollutants, dataTime } = feed.current.data}
		<div class="top">
			<div class="heading">
				<CategoryBadge category={index.category} color={index.color} />
				<h3 id="city-{location.key}">
					<!-- Stretched over the whole card so the card is one large tap target. -->
					<button type="button" class="open" onclick={() => onopen(feed)}>{location.name}</button>
				</h3>
				<p class="note">{location.note}</p>
			</div>
			<AqiGauge aqi={index.aqi} display={index.aqiDisplay} color={index.color} />
		</div>

		<dl class="pollutants">
			{#each SUMMARY_POLLUTANTS as code (code)}
				{@const reading = pollutants.find((p) => p.code === code)}
				<div class="tile">
					<dt>{POLLUTANT_LABELS[code]}</dt>
					<dd>
						{#if reading}
							<span class="value">{formatConcentration(reading.value)}</span>
							<span class="unit">{unitLabel(reading.units)}</span>
						{:else}
							<span aria-hidden="true">–</span><span class="visually-hidden">Data belum tersedia</span>
						{/if}
					</dd>
				</div>
			{/each}
		</dl>

		<div class="forecast">
			<p class="section-label">Prakiraan 24 jam</p>
			{#if feed.forecast.status === 'success'}
				<TrendChart
					compact
					timeZone={location.timeZone}
					label="Prakiraan AQI 24 jam untuk {location.name}"
					points={feed.forecast.data.map((h) => ({ dateTime: h.dataTime, aqi: h.index.aqi }))}
				/>
			{:else if feed.forecast.status === 'error'}
				<p class="muted">Prakiraan belum tersedia</p>
			{:else}
				<div class="skeleton-block" style:height="80px"></div>
			{/if}
		</div>

		<p class="time">Data {formatHour(dataTime, location.timeZone)} {timeZoneLabel(location.timeZone, new Date(dataTime))}</p>
	{:else if feed.current.status === 'error'}
		{@const message = ERROR_MESSAGES[feed.current.code]}
		<div class="heading">
			<h3 id="city-{location.key}">{location.name}</h3>
			<p class="note">{location.note}</p>
		</div>
		<div class="error" role="alert">
			<p class="error-title">{message.title}</p>
			<p class="muted">{message.description}</p>
			<button type="button" class="button button-secondary retry" onclick={() => feed.load()}>Coba lagi</button>
		</div>
	{:else}
		<div class="top">
			<div class="heading">
				<div class="skeleton-block" style:width="88px" style:height="24px"></div>
				<h3 id="city-{location.key}">{location.name}</h3>
				<p class="note">{location.note}</p>
			</div>
			<div class="skeleton-block" style:width="64px" style:height="64px" style:border-radius="50%"></div>
		</div>
		<div class="pollutants" aria-hidden="true">
			{#each SUMMARY_POLLUTANTS as code (code)}
				<div class="tile"><div class="skeleton-block" style:height="34px"></div></div>
			{/each}
		</div>
		<div class="skeleton-block" style:height="100px" aria-hidden="true"></div>
		<p class="visually-hidden">Memuat data {location.name}</p>
	{/if}
</article>

<style>
	.city {
		position: relative;
		display: grid;
		align-content: start;
		gap: var(--space-2);
		min-height: 352px;
		padding: var(--space-3) 20px 20px;
		transition:
			border-color var(--transition),
			box-shadow var(--transition);
	}

	.city:has(.open):hover {
		border-color: #bfdbfe;
		box-shadow: 0 4px 16px rgb(37 99 235 / 0.08);
	}

	.top {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.heading {
		display: grid;
		justify-items: start;
		gap: 6px;
		min-width: 0;
	}

	h3 {
		margin-top: 4px;
		font-size: 1.1875rem;
		font-weight: 600;
	}

	.open {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.open::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}

	.open:focus-visible {
		outline: none;
	}

	.open:focus-visible::after {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.note {
		margin-top: -4px;
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.pollutants {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 6px;
		margin: 0;
	}

	.tile {
		display: grid;
		gap: 2px;
		padding: 8px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-label);
		font-weight: 600;
	}

	dd {
		display: grid;
		margin: 0;
		line-height: 1.2;
	}

	.value {
		font-size: var(--text-body);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.unit {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.forecast {
		display: grid;
		gap: var(--space-1);
	}

	.section-label {
		font-size: var(--text-label);
		font-weight: 600;
	}

	.muted {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.time {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.error {
		display: grid;
		justify-items: start;
		gap: 4px;
		padding: var(--space-2);
		border-radius: 12px;
		background: #fef2f2;
	}

	.error-title {
		color: var(--color-danger);
		font-weight: 600;
	}

	.retry {
		margin-top: var(--space-1);
		min-height: 40px;
	}
</style>
