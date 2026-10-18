<script lang="ts" module>
	export type SortKey = 'default' | 'best' | 'worst' | 'name';

	export interface ListFilter {
		range: [number, number];
		sort: SortKey;
	}

	export const DEFAULT_FILTER: ListFilter = { range: [0, 100], sort: 'default' };

	const SORT_OPTIONS: { value: SortKey; label: string }[] = [
		{ value: 'default', label: 'Urutan bawaan' },
		{ value: 'best', label: 'AQI tertinggi (udara terbaik)' },
		{ value: 'worst', label: 'AQI terendah (udara terburuk)' },
		{ value: 'name', label: 'Nama kota A–Z' }
	];
</script>

<script lang="ts">
	import { Popover, RadioGroup, Slider, Tabs } from 'bits-ui';

	let { value, onapply }: { value: ListFilter; onapply: (next: ListFilter) => void } = $props();

	let open = $state(false);
	let tab = $state('filter');
	// Draft values: edits apply only when the user presses "Terapkan".
	let range = $state<number[]>([0, 100]);
	let sort = $state<string>('default');

	const active = $derived(value.range[0] > 0 || value.range[1] < 100 || value.sort !== 'default');

	function syncDraft(next: boolean) {
		if (!next) return;
		range = [...value.range];
		sort = value.sort;
	}

	function apply() {
		onapply({ range: [range[0], range[1]], sort: sort as SortKey });
		open = false;
	}
</script>

<Popover.Root bind:open onOpenChange={syncDraft}>
	<Popover.Trigger class="button button-secondary sf-trigger">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
			<path d="M4 6h16M7 12h10M10 18h4" />
		</svg>
		Urutkan &amp; filter
		{#if active}<span class="sf-active" aria-label="(aktif)"></span>{/if}
	</Popover.Trigger>

	<Popover.Portal>
		<Popover.Content class="sf-content" align="end" sideOffset={8} collisionPadding={16}>
			<Tabs.Root bind:value={tab}>
				<Tabs.List class="sf-tabs">
					<Tabs.Trigger value="filter" class="sf-tab">Filter</Tabs.Trigger>
					<Tabs.Trigger value="sort" class="sf-tab">Urutkan</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="filter" class="sf-panel">
					<div class="sf-range-head">
						<span id="sf-range-label">Rentang AQI</span>
						<span class="sf-range-value">{range[0]}–{range[1]}</span>
					</div>
					<Slider.Root type="multiple" bind:value={range} min={0} max={100} step={1} class="sf-slider" aria-labelledby="sf-range-label">
						{#snippet children({ thumbItems })}
							<span class="sf-track"><Slider.Range class="sf-fill" /></span>
							{#each thumbItems as { index } (index)}
								<Slider.Thumb {index} class="sf-thumb" aria-label={index === 0 ? 'AQI minimum' : 'AQI maksimum'} />
							{/each}
						{/snippet}
					</Slider.Root>
					<div class="sf-scale" aria-hidden="true"><span>0 · buruk</span><span>100 · baik</span></div>
					<p class="sf-hint">Lokasi yang datanya belum termuat tetap ditampilkan.</p>
				</Tabs.Content>

				<Tabs.Content value="sort" class="sf-panel">
					<RadioGroup.Root bind:value={sort} class="sf-options" aria-label="Urutkan lokasi">
						{#each SORT_OPTIONS as option (option.value)}
							<label class="sf-option">
								<RadioGroup.Item value={option.value} class="sf-radio">
									{#snippet children({ checked })}
										{#if checked}<span class="sf-radio-dot"></span>{/if}
									{/snippet}
								</RadioGroup.Item>
								{option.label}
							</label>
						{/each}
					</RadioGroup.Root>
				</Tabs.Content>
			</Tabs.Root>

			<div class="sf-footer">
				<button
					type="button"
					class="sf-reset"
					onclick={() => {
						range = [...DEFAULT_FILTER.range];
						sort = DEFAULT_FILTER.sort;
					}}
				>
					Atur ulang
				</button>
				<div class="sf-actions">
					<Popover.Close class="button button-secondary sf-small">Batal</Popover.Close>
					<button type="button" class="button button-primary sf-small" onclick={apply}>Terapkan</button>
				</div>
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

<style>
	:global(.sf-trigger) {
		position: relative;
	}

	.sf-active {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-primary);
	}

	:global(.sf-content) {
		z-index: 40;
		width: min(340px, calc(100vw - 32px));
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: 0 12px 32px rgb(15 23 42 / 0.12);
		animation: sf-in 150ms ease;
	}

	@keyframes sf-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}

	:global(.sf-tabs) {
		display: grid;
		grid-template-columns: 1fr 1fr;
		margin-bottom: var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}

	:global(.sf-tab) {
		min-height: var(--control-height);
		border: 0;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	:global(.sf-tab[data-state='active']) {
		border-bottom-color: var(--color-primary);
		color: var(--color-primary);
	}

	:global(.sf-panel[data-state='active']) {
		display: grid;
		gap: 12px;
		min-height: 168px;
		align-content: start;
	}

	:global(.sf-panel[data-state='inactive']) {
		display: none;
	}

	.sf-range-head {
		display: flex;
		justify-content: space-between;
		font-weight: 600;
		font-size: var(--text-body);
	}

	.sf-range-value {
		color: var(--color-primary);
		font-variant-numeric: tabular-nums;
	}

	:global(.sf-slider) {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		height: 32px;
		touch-action: none;
	}

	.sf-track {
		position: relative;
		width: 100%;
		height: 6px;
		border-radius: 999px;
		background: var(--color-border);
	}

	:global(.sf-fill) {
		position: absolute;
		height: 100%;
		border-radius: 999px;
		background: var(--color-primary);
	}

	:global(.sf-thumb) {
		display: block;
		width: 22px;
		height: 22px;
		border: 2px solid var(--color-primary);
		border-radius: 50%;
		background: var(--color-surface);
		box-shadow: var(--shadow);
		cursor: grab;
	}

	:global(.sf-thumb:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.sf-scale {
		display: flex;
		justify-content: space-between;
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.sf-hint {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	:global(.sf-options) {
		display: grid;
		gap: 2px;
	}

	.sf-option {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--control-height);
		padding: 0 var(--space-1);
		border-radius: 10px;
		font-size: var(--text-body);
		cursor: pointer;
	}

	.sf-option:hover {
		background: var(--color-primary-soft);
	}

	:global(.sf-radio) {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		padding: 0;
		border: 2px solid #cbd5e1;
		border-radius: 50%;
		background: var(--color-surface);
		cursor: pointer;
	}

	:global(.sf-radio[data-state='checked']) {
		border-color: var(--color-primary);
	}

	.sf-radio-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-primary);
	}

	.sf-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1);
		margin-top: var(--space-2);
		padding-top: var(--space-2);
		border-top: 1px solid var(--color-border);
	}

	.sf-reset {
		min-height: var(--control-height);
		padding: 0 4px;
		border: 0;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-size: var(--text-label);
		cursor: pointer;
	}

	.sf-reset:hover {
		color: var(--color-primary);
	}

	.sf-actions {
		display: flex;
		gap: var(--space-1);
	}

	:global(.sf-small) {
		min-height: 40px;
		font-size: var(--text-body);
	}
</style>
