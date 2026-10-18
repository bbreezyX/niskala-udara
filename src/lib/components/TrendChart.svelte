<script lang="ts" module>
	export interface TrendPoint {
		dateTime: string;
		aqi: number;
		/** Forecast points render dashed, after the "Sekarang" marker. */
		forecast?: boolean;
	}
</script>

<script lang="ts">
	import { formatHour } from '#lib/format.ts';

	interface Props {
		points: TrendPoint[];
		timeZone: string;
		/** dateTime of a point to mark, e.g. the selected history row. */
		selected?: string | null;
		compact?: boolean;
		label: string;
	}

	let { points, timeZone, selected = null, compact = false, label }: Props = $props();

	const times = $derived(points.map((p) => Date.parse(p.dateTime)));
	const start = $derived(Math.min(...times));
	const span = $derived(Math.max(...times) - start || 1);

	const x = (iso: string) => ((Date.parse(iso) - start) / span) * 100;
	const y = (aqi: number) => 100 - Math.min(100, Math.max(0, aqi));
	const line = (series: TrendPoint[]) => series.map((p, i) => `${i ? 'L' : 'M'}${x(p.dateTime)},${y(p.aqi)}`).join(' ');

	const past = $derived(points.filter((p) => !p.forecast));
	// Forecast line starts at the last observed point so the two series connect.
	const future = $derived([...past.slice(-1), ...points.filter((p) => p.forecast)]);
	const area = $derived(past.length > 1 ? `${line(past)} L${x(past.at(-1)!.dateTime)},100 L${x(past[0].dateTime)},100 Z` : '');
	const nowX = $derived(past.length && future.length > 1 ? x(past.at(-1)!.dateTime) : null);

	const ticks = $derived.by(() => {
		const count = compact ? 3 : 5;
		if (points.length < 2) return points;
		return Array.from({ length: count }, (_, i) => points[Math.round((i * (points.length - 1)) / (count - 1))]);
	});

	// Beyond a day the same hour repeats, so prefix the weekday.
	const multiDay = $derived(span > 26 * 3_600_000);
	const weekday = $derived(new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone }));
	const tickLabel = (iso: string) =>
		multiDay ? `${weekday.format(new Date(iso))} ${formatHour(iso, timeZone)}` : formatHour(iso, timeZone);

	const marked = $derived(selected ? points.find((p) => p.dateTime === selected) : undefined);

	const summary = $derived.by(() => {
		if (points.length === 0) return label;
		const values = points.map((p) => p.aqi);
		return `${label}. Terendah ${Math.min(...values)}, tertinggi ${Math.max(...values)}.`;
	});
</script>

<figure class="chart" class:compact role="img" aria-label={summary}>
	{#if !compact}
		<div class="y-axis" aria-hidden="true">
			{#each [100, 75, 50, 25, 0] as tick (tick)}
				<span style:top="{100 - tick}%">{tick}</span>
			{/each}
		</div>
	{/if}

	<div class="plot" aria-hidden="true">
		<svg viewBox="0 0 100 100" preserveAspectRatio="none">
			{#if !compact}
				{#each [0, 25, 50, 75, 100] as tick (tick)}
					<line class="grid" x1="0" x2="100" y1={tick} y2={tick} />
				{/each}
			{/if}
			{#if area}
				<path class="area" d={area} />
			{/if}
			{#if past.length > 1}
				<path class="line" d={line(past)} />
			{/if}
			{#if future.length > 1}
				<path class="line forecast" d={line(future)} />
			{/if}
			{#if nowX !== null}
				<line class="now" x1={nowX} x2={nowX} y1="0" y2="100" />
			{/if}
		</svg>

		{#if nowX !== null && !compact}
			<span class="now-label" style:left="{nowX}%">Sekarang</span>
		{/if}
		{#if marked}
			<span class="marker" style:left="{x(marked.dateTime)}%" style:top="{y(marked.aqi)}%"></span>
		{:else if points.length === 1}
			<span class="marker" style:left="50%" style:top="{y(points[0].aqi)}%"></span>
		{/if}
	</div>

	<div class="x-axis" aria-hidden="true">
		{#each ticks as tick, i (i)}
			<span>{tickLabel(tick.dateTime)}</span>
		{/each}
	</div>
</figure>

<style>
	.chart {
		display: grid;
		grid-template-columns: 28px 1fr;
		grid-template-rows: 160px auto;
		column-gap: var(--space-1);
		row-gap: var(--space-1);
		margin: 0;
	}

	.compact {
		grid-template-columns: 1fr;
		grid-template-rows: 64px auto;
	}

	.y-axis {
		position: relative;
		color: var(--color-text-muted);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
	}

	.y-axis span {
		position: absolute;
		right: 0;
		transform: translateY(-50%);
	}

	.plot {
		position: relative;
		min-width: 0;
	}

	svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	svg * {
		vector-effect: non-scaling-stroke;
	}

	.grid {
		stroke: var(--color-border);
		stroke-width: 1;
		stroke-dasharray: 3 4;
	}

	.area {
		fill: var(--color-primary);
		opacity: 0.08;
	}

	.line {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.forecast {
		stroke-dasharray: 4 4;
		opacity: 0.75;
	}

	.now {
		stroke: var(--color-text-muted);
		stroke-width: 1;
		stroke-dasharray: 2 3;
	}

	.now-label {
		position: absolute;
		top: -2px;
		padding: 0 4px;
		transform: translate(-50%, -100%);
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: 0.6875rem;
		white-space: nowrap;
	}

	.marker {
		position: absolute;
		width: 12px;
		height: 12px;
		border: 3px solid var(--color-surface);
		border-radius: 50%;
		background: var(--color-primary);
		box-shadow: 0 0 0 1px var(--color-primary);
		transform: translate(-50%, -50%);
	}

	.x-axis {
		grid-column: -2;
		display: flex;
		justify-content: space-between;
		color: var(--color-text-muted);
		font-size: 0.6875rem;
		font-variant-numeric: tabular-nums;
	}
</style>
