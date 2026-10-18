<script lang="ts">
	import { POLLUTANT_LABELS, formatConcentration, unitLabel } from '#lib/format.ts';
	import { POLLUTANT_CODES, type PollutantReading } from '#lib/types.ts';

	let { pollutants, title = 'Kadar polutan' }: { pollutants: PollutantReading[]; title?: string } = $props();

	const items = $derived(
		POLLUTANT_CODES.map((code) => ({
			code,
			label: POLLUTANT_LABELS[code],
			reading: pollutants.find((p) => p.code === code)
		}))
	);
</script>

<section class="pollutants">
	<h3>{title}</h3>
	<dl class="grid">
		{#each items as { code, label, reading } (code)}
			<div class="item">
				<dt>{label}</dt>
				<dd>
					{#if reading}
						<span class="value">{formatConcentration(reading.value)}</span>
						{#if unitLabel(reading.units)}
							<span class="unit">{unitLabel(reading.units)}</span>
						{/if}
					{:else}
						<span class="missing">Data belum tersedia</span>
					{/if}
				</dd>
			</div>
		{/each}
	</dl>
</section>

<style>
	.pollutants {
		container-type: inline-size;
	}

	h3 {
		margin-bottom: 12px;
		font-size: 1rem;
		font-weight: 600;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-1);
		margin: 0;
	}

	@container (min-width: 400px) {
		.grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.item {
		display: grid;
		align-content: start;
		gap: 2px;
		min-height: 76px;
		padding: 12px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-label);
		font-weight: 600;
	}

	dd {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 6px;
		margin: 0;
	}

	.value {
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.3;
		font-variant-numeric: tabular-nums;
	}

	.unit {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.missing {
		color: var(--color-text-muted);
		font-size: var(--text-label);
		line-height: 1.4;
	}
</style>
