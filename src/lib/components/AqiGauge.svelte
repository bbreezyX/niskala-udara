<script lang="ts">
	interface Props {
		aqi: number;
		display: string;
		color: string | null;
		size?: 'sm' | 'lg';
	}

	let { aqi, display, color, size = 'sm' }: Props = $props();

	/** The ring covers 270°, open at the bottom; UAQI is 0–100. */
	const ARC = 75;
	const filled = $derived((Math.min(100, Math.max(0, aqi)) / 100) * ARC);
</script>

<div class="gauge {size}" role="img" aria-label="AQI {display} dari 100">
	<svg viewBox="0 0 40 40" aria-hidden="true">
		<circle class="track" cx="20" cy="20" r="16" pathLength="100" stroke-dasharray="{ARC} 100" />
		<circle
			class="value"
			cx="20"
			cy="20"
			r="16"
			pathLength="100"
			stroke-dasharray="{filled} 100"
			style:stroke={color ?? 'var(--color-primary)'}
		/>
	</svg>
	<span class="label" aria-hidden="true">
		<span class="number">{display}</span>
		<span class="unit">AQI</span>
	</span>
</div>

<style>
	.gauge {
		position: relative;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.sm {
		width: 64px;
		height: 64px;
	}

	.lg {
		width: 184px;
		height: 184px;
	}

	@media (min-width: 640px) {
		.lg {
			width: 240px;
			height: 240px;
		}
	}

	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform: rotate(135deg);
	}

	circle {
		fill: none;
		stroke-linecap: round;
	}

	.track {
		stroke: var(--color-border);
		stroke-width: 3.5;
	}

	.value {
		stroke-width: 3.5;
		transition: stroke-dasharray 200ms ease;
	}

	.label {
		display: grid;
		justify-items: center;
		line-height: 1;
		transform: translateY(2px);
	}

	.number {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.03em;
	}

	.sm .number {
		font-size: 1.25rem;
	}

	.lg .number {
		font-size: var(--text-aqi);
	}

	.unit {
		margin-top: 2px;
		color: var(--color-text-muted);
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.lg .unit {
		margin-top: 6px;
		font-size: var(--text-label);
	}
</style>
