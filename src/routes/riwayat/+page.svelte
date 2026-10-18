<script lang="ts">
	import { Pagination, Select, ToggleGroup } from 'bits-ui';
	import { CITIES, cityNote, REGIONS } from '#lib/config/cities.ts';
	import { HISTORY_RANGES, type HistoryRange } from '#lib/coordinates.ts';
	import { postJson, toRemote, type Remote } from '#lib/client/api.ts';
	import { ERROR_MESSAGES, formatDataTime, formatDay, formatHour, pollutantLabel, timeZoneLabel } from '#lib/format.ts';
	import type { AirQualityData } from '#lib/types.ts';
	import AqiGauge from '#lib/components/AqiGauge.svelte';
	import Attribution from '#lib/components/Attribution.svelte';
	import CategoryBadge from '#lib/components/CategoryBadge.svelte';
	import PollutantGrid from '#lib/components/PollutantGrid.svelte';
	import Recommendation from '#lib/components/Recommendation.svelte';
	import StateMessage from '#lib/components/StateMessage.svelte';
	import TrendChart from '#lib/components/TrendChart.svelte';
	import type { PageProps } from './$types';

	let { data: page }: PageProps = $props();

	const PER_PAGE = 12;

	let cityId = $state(CITIES[0].id);
	let range = $state<string>(String(HISTORY_RANGES[0]));
	let history = $state<Remote<AirQualityData[]>>({ status: 'idle' });
	let selectedTime = $state<string | null>(null);
	let currentPage = $state(1);
	let reloadVersion = $state(0);
	let panel = $state<HTMLElement>();

	const city = $derived(CITIES.find((c) => c.id === cityId) ?? CITIES[0]);
	const zone = $derived(timeZoneLabel(city.timeZone));

	// One request per city/range; a newer selection aborts the older one.
	$effect(() => {
		if (!page.configured) return;
		void reloadVersion;
		const hours = Number(range) as HistoryRange;
		const { latitude, longitude } = city;
		const controller = new AbortController();
		history = { status: 'loading' };
		selectedTime = null;
		currentPage = 1;
		postJson<AirQualityData[]>('/api/air-quality/history', { latitude, longitude, hours }, controller.signal).then(
			(result) => {
				if (result) history = toRemote(result);
			}
		);
		return () => controller.abort();
	});

	const hours = $derived(history.status === 'success' ? history.data : []);
	// Newest first, each compared with the hour before it.
	const rows = $derived(
		hours
			.map((hour, i) => ({ hour, change: i > 0 ? hour.index.aqi - hours[i - 1].index.aqi : null }))
			.reverse()
	);
	const pageRows = $derived(rows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE));
	const selected = $derived(rows.find((r) => r.hour.dataTime === selectedTime)?.hour ?? rows[0]?.hour);

	function select(dateTime: string) {
		selectedTime = dateTime;
		// When the panel sits below the table, bring it into view.
		if (panel && !matchMedia('(min-width: 1100px)').matches) panel.scrollIntoView({ block: 'start' });
	}

	function trendLabel(change: number | null) {
		if (change === null) return { text: 'Awal data', tone: 'flat', icon: '' };
		if (change > 0) return { text: `Membaik ${change}`, tone: 'up', icon: 'M7 17 17 7M9 7h8v8' };
		if (change < 0) return { text: `Memburuk ${-change}`, tone: 'down', icon: 'M7 7l10 10M17 9v8H9' };
		return { text: 'Stabil', tone: 'flat', icon: 'M5 12h14M13 6l6 6-6 6' };
	}
</script>

<svelte:head>
	<title>Riwayat · Niskala Udara</title>
	<meta name="description" content="Riwayat kualitas udara per jam untuk kota-kota pantauan." />
</svelte:head>

<div class="container page">
	<header class="intro">
		<h1>Riwayat kualitas udara</h1>
		<p class="lead">Catatan per jam dari Google. Pilih baris untuk melihat detailnya.</p>
	</header>

	{#if !page.configured}
		<StateMessage tone="error" title={ERROR_MESSAGES.not_configured.title} description={ERROR_MESSAGES.not_configured.description} />
	{:else}
		<div class="layout">
			<section class="card records" aria-labelledby="records-title">
				<div class="records-head">
					<div>
						<h2 id="records-title">Catatan per jam</h2>
						<p class="muted">{cityNote(city)} · waktu dalam {zone}</p>
					</div>
					<div class="filters">
						<span id="city-label" class="visually-hidden">Kota</span>
						<Select.Root type="single" bind:value={cityId} items={CITIES.map((c) => ({ value: c.id, label: c.name }))}>
							<Select.Trigger class="hs-select" aria-labelledby="city-label">
								{city.name}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d="m4 6 4 4 4-4" />
								</svg>
							</Select.Trigger>
							<Select.Portal>
								<Select.Content class="hs-select-content" sideOffset={6}>
									{#each REGIONS as region (region.id)}
										<Select.Group>
											<Select.GroupHeading class="hs-group">{region.name}</Select.GroupHeading>
											{#each CITIES.filter((c) => c.region === region.id) as option (option.id)}
												<Select.Item value={option.id} label={option.name} class="hs-option">
													{#snippet children({ selected: isSelected })}
														{option.name}
														{#if isSelected}
															<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
																<path d="m5 12 5 5 9-10" />
															</svg>
														{/if}
													{/snippet}
												</Select.Item>
											{/each}
										</Select.Group>
									{/each}
								</Select.Content>
							</Select.Portal>
						</Select.Root>

						<ToggleGroup.Root
							type="single"
							bind:value={range}
							onValueChange={(next) => {
								// A single-select toggle can be cleared by clicking the active item; keep one selected.
								if (!next) range = String(HISTORY_RANGES[0]);
							}}
							class="hs-segment"
							aria-label="Rentang waktu"
						>
							{#each HISTORY_RANGES as hours (hours)}
								<ToggleGroup.Item value={String(hours)} class="hs-segment-item">{hours} jam</ToggleGroup.Item>
							{/each}
						</ToggleGroup.Root>
					</div>
				</div>

				{#if history.status === 'error'}
					{@const message = ERROR_MESSAGES[history.code]}
					<div class="error" role="alert">
						<p class="error-title">{message.title}</p>
						<p class="muted">{message.description}</p>
						<button type="button" class="button button-primary" onclick={() => reloadVersion++}>Coba lagi</button>
					</div>
				{:else}
					<div class="table-wrap">
						<table aria-busy={history.status === 'loading'}>
							<caption class="visually-hidden">Kualitas udara per jam di {city.name}, terbaru di atas</caption>
							<thead>
								<tr>
									<th scope="col">Waktu</th>
									<th scope="col" class="num">AQI</th>
									<th scope="col">Kategori</th>
									<th scope="col" class="wide">Polutan dominan</th>
									<th scope="col">Tren</th>
								</tr>
							</thead>
							<tbody>
								{#if history.status === 'success'}
									{#each pageRows as { hour, change } (hour.dataTime)}
										{@const trend = trendLabel(change)}
										{@const isSelected = hour.dataTime === selected?.dataTime}
										<tr class:selected={isSelected}>
											<td>
												<button type="button" class="row-button" aria-pressed={isSelected} onclick={() => select(hour.dataTime)}>
													<span class="hour">{formatHour(hour.dataTime, city.timeZone)}</span>
													<span class="day">{formatDay(hour.dataTime, city.timeZone)}</span>
												</button>
											</td>
											<td class="num aqi">{hour.index.aqiDisplay}</td>
											<td class="category"><CategoryBadge category={hour.index.category} color={hour.index.color} /></td>
											<td class="wide">{hour.index.dominantPollutant ? pollutantLabel(hour.index.dominantPollutant) : '–'}</td>
											<td>
												<span class="trend {trend.tone}">
													{#if trend.icon}
														<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
															<path d={trend.icon} />
														</svg>
													{/if}
													<span class="trend-text">{trend.text}</span>
												</span>
											</td>
										</tr>
									{/each}
								{:else}
									{#each { length: 8 }, i (i)}
										<tr aria-hidden="true">
											<td colspan="5"><div class="skeleton-block" style:height="28px"></div></td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>

					{#if rows.length > PER_PAGE}
						<Pagination.Root count={rows.length} perPage={PER_PAGE} bind:page={currentPage} class="hs-pagination">
							{#snippet children({ pages })}
								<Pagination.PrevButton class="hs-page-nav">Sebelumnya</Pagination.PrevButton>
								<div class="pages">
									{#each pages as item (item.key)}
										{#if item.type === 'ellipsis'}
											<span class="ellipsis" aria-hidden="true">…</span>
										{:else}
											<Pagination.Page page={item} class="hs-page" aria-label="Halaman {item.value}">{item.value}</Pagination.Page>
										{/if}
									{/each}
								</div>
								<Pagination.NextButton class="hs-page-nav">Berikutnya</Pagination.NextButton>
							{/snippet}
						</Pagination.Root>
					{/if}
				{/if}
			</section>

			<aside class="card detail" bind:this={panel} aria-labelledby="detail-title" tabindex="-1">
				{#if selected}
					<header class="detail-head">
						<h2 id="detail-title">{city.name}</h2>
						<p class="muted"><time datetime={selected.dataTime}>{formatDataTime(selected.dataTime, city.timeZone)}</time></p>
					</header>

					<div class="summary">
						<AqiGauge size="lg" aqi={selected.index.aqi} display={selected.index.aqiDisplay} color={selected.index.color} />
						<div class="summary-text">
							<CategoryBadge category={selected.index.category} color={selected.index.color} />
							<p class="muted">{selected.index.displayName}</p>
							{#if selected.index.dominantPollutant}
								<p class="dominant">Polutan dominan: <strong>{pollutantLabel(selected.index.dominantPollutant)}</strong></p>
							{/if}
						</div>
					</div>
					<p class="scale">Skala 0–100. Semakin tinggi, semakin baik kualitas udaranya.</p>

					<section class="trend-box">
						<h3>Tren AQI {range} jam</h3>
						<TrendChart
							points={hours.map((h) => ({ dateTime: h.dataTime, aqi: h.index.aqi }))}
							timeZone={city.timeZone}
							selected={selected.dataTime}
							label="Tren AQI {city.name}, {range} jam terakhir"
						/>
					</section>

					<PollutantGrid pollutants={selected.pollutants} title="Kadar polutan pada jam ini" />
					<Recommendation text={selected.generalRecommendation} />
					<Attribution />
				{:else}
					<h2 id="detail-title" class="visually-hidden">Detail</h2>
					<div class="skeleton-block" style:height="128px"></div>
					<div class="skeleton-block" style:height="200px"></div>
				{/if}
			</aside>
		</div>
	{/if}
</div>

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
		align-items: start;
	}

	@media (min-width: 1100px) {
		.layout {
			grid-template-columns: minmax(0, 1.45fr) minmax(360px, 1fr);
		}

		.detail {
			position: sticky;
			top: var(--space-2);
			max-height: calc(100vh - 2 * var(--space-2));
			overflow-y: auto;
		}
	}

	.records,
	.detail {
		display: grid;
		gap: var(--space-2);
		padding: 20px;
		min-width: 0;
	}

	.detail {
		align-content: start;
		gap: 20px;
		outline: none;
		scroll-margin-top: 80px;
	}

	.records-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	h2 {
		font-size: 1.125rem;
		font-weight: 600;
	}

	h3 {
		font-size: 1rem;
		font-weight: 600;
	}

	.muted {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	:global(.hs-select) {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1);
		min-width: 160px;
		min-height: var(--control-height);
		padding: 0 14px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	:global(.hs-select:hover) {
		border-color: #cbd5e1;
	}

	:global(.hs-select-content) {
		z-index: 40;
		min-width: var(--bits-select-anchor-width);
		max-height: min(420px, var(--bits-select-content-available-height));
		overflow-y: auto;
		padding: 6px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: 0 12px 32px rgb(15 23 42 / 0.12);
	}

	:global(.hs-group) {
		padding: 10px 12px 4px;
		color: var(--color-text-muted);
		font-size: var(--text-label);
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	:global(.hs-option) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: var(--control-height);
		padding: 0 12px;
		border-radius: 10px;
		cursor: pointer;
	}

	:global(.hs-option[data-highlighted]) {
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}

	:global(.hs-segment) {
		display: inline-flex;
		padding: 4px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface-muted);
	}

	:global(.hs-segment-item) {
		min-height: 36px;
		padding: 0 14px;
		border: 0;
		border-radius: 9px;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: var(--text-label);
		font-weight: 600;
		cursor: pointer;
	}

	:global(.hs-segment-item[data-state='on']) {
		background: var(--color-surface);
		color: var(--color-primary);
		box-shadow: var(--shadow);
	}

	.table-wrap {
		overflow-x: auto;
		margin: 0 -20px;
		padding: 0 20px;
	}

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-size: var(--text-body);
	}

	th {
		padding: 10px 12px;
		background: var(--color-surface-muted);
		color: var(--color-text-muted);
		font-size: var(--text-label);
		font-weight: 600;
		text-align: left;
		white-space: nowrap;
	}

	th:first-child {
		border-radius: 10px 0 0 10px;
	}

	th:last-child {
		border-radius: 0 10px 10px 0;
	}

	td {
		padding: 8px 12px;
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
		white-space: nowrap;
	}

	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.aqi {
		font-weight: 600;
	}

	tr.selected td {
		background: var(--color-primary-soft);
	}

	tr.selected td:first-child {
		box-shadow: inset 3px 0 0 var(--color-primary);
	}

	tr:not(.selected):hover td {
		background: var(--color-surface-muted);
	}

	.row-button {
		display: grid;
		justify-items: start;
		min-height: var(--control-height);
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text);
		font: inherit;
		line-height: 1.25;
		text-align: left;
		cursor: pointer;
	}

	.hour {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.day {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.trend {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-label);
		font-weight: 600;
	}

	.trend.up {
		color: #15803d;
	}

	.trend.down {
		color: var(--color-danger);
	}

	.trend.flat {
		color: var(--color-text-muted);
	}

	@media (max-width: 639px) {
		.wide {
			display: none;
		}
	}

	/* Phones: keep every column on screen; the trend keeps its text for screen readers. */
	@media (max-width: 479px) {
		th,
		td {
			padding-inline: 8px;
		}

		td.category {
			white-space: normal;
		}

		.trend-text {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
	}

	:global(.hs-pagination) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1);
	}

	.pages {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	:global(.hs-page),
	:global(.hs-page-nav) {
		min-width: 40px;
		min-height: 40px;
		padding: 0 12px;
		border: 1px solid transparent;
		border-radius: 10px;
		background: none;
		color: var(--color-text);
		font: inherit;
		font-size: var(--text-label);
		cursor: pointer;
	}

	:global(.hs-page-nav) {
		border-color: var(--color-border);
	}

	:global(.hs-page:hover),
	:global(.hs-page-nav:hover:not(:disabled)) {
		background: var(--color-primary-soft);
	}

	:global(.hs-page[data-selected]) {
		border-color: var(--color-primary);
		color: var(--color-primary);
		font-weight: 600;
	}

	:global(.hs-page-nav:disabled) {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.ellipsis {
		color: var(--color-text-muted);
	}

	.detail-head {
		display: grid;
		gap: 2px;
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

	.dominant {
		color: var(--color-text-muted);
		font-size: var(--text-body);
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

	.trend-box {
		display: grid;
		gap: 20px;
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: 12px;
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

	@media (max-width: 479px) {
		.page {
			padding-top: var(--space-3);
		}

		.records,
		.detail {
			padding: var(--space-2);
		}

		.table-wrap {
			margin: 0 calc(-1 * var(--space-2));
			padding: 0 var(--space-2);
		}

		:global(.hs-page-nav) {
			padding: 0 8px;
		}
	}
</style>
