<script lang="ts">
	import { Combobox } from 'bits-ui';
	import { cityNote, REGIONS, type City } from '#lib/config/cities.ts';

	let { cities, onselect }: { cities: readonly City[]; onselect: (city: City) => void } = $props();

	let value = $state('');
	let search = $state('');

	const filtered = $derived(
		search.trim() === '' ? cities : cities.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
	);
	const groups = $derived(
		REGIONS.map((region) => ({ ...region, cities: filtered.filter((c) => c.region === region.id) })).filter(
			(group) => group.cities.length > 0
		)
	);

	function handleValueChange(id: string) {
		const city = cities.find((c) => c.id === id);
		if (!city) return;
		onselect(city);
		// Clear so the same city can be picked again later.
		value = '';
		search = '';
	}
</script>

<Combobox.Root
	type="single"
	bind:value
	onValueChange={handleValueChange}
	onOpenChange={(next) => {
		if (!next) search = '';
	}}
	items={cities.map((c) => ({ value: c.id, label: c.name }))}
>
	<div class="cs-field">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
			<circle cx="11" cy="11" r="6.5" />
			<path d="m20 20-4.2-4.2" />
		</svg>
		<Combobox.Input
			class="cs-input"
			placeholder="Cari kota…"
			aria-label="Cari kota pantauan"
			oninput={(event) => (search = event.currentTarget.value)}
		/>
		<Combobox.Trigger class="cs-trigger" aria-label="Tampilkan semua kota">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="m4 6 4 4 4-4" />
			</svg>
		</Combobox.Trigger>
	</div>

	<Combobox.Portal>
		<Combobox.Content class="cs-content" sideOffset={6}>
			{#each groups as group (group.id)}
				<Combobox.Group>
					<Combobox.GroupHeading class="cs-group">{group.name}</Combobox.GroupHeading>
					{#each group.cities as city (city.id)}
						<Combobox.Item value={city.id} label={city.name} class="cs-item">
							<span>{city.name}</span>
							<span class="cs-meta">{cityNote(city)}</span>
						</Combobox.Item>
					{/each}
				</Combobox.Group>
			{:else}
				<p class="cs-empty">Kota tidak ditemukan. Hanya kota pantauan yang tersedia.</p>
			{/each}
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>

<style>
	.cs-field {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		color: var(--color-text-muted);
	}

	.cs-field > svg {
		position: absolute;
		left: 14px;
		pointer-events: none;
	}

	:global(.cs-input) {
		width: 100%;
		min-height: 48px;
		padding: 0 48px 0 42px;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		transition: border-color var(--transition);
	}

	:global(.cs-input:hover) {
		border-color: #cbd5e1;
	}

	:global(.cs-input:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 0;
		border-color: var(--color-primary);
	}

	:global(.cs-trigger) {
		position: absolute;
		right: 4px;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 0;
		border-radius: 50%;
		background: var(--color-primary);
		color: #fff;
		cursor: pointer;
	}

	:global(.cs-content) {
		z-index: 40;
		width: var(--bits-combobox-anchor-width);
		min-width: 240px;
		max-height: min(420px, var(--bits-combobox-content-available-height));
		overflow-y: auto;
		padding: 6px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: 0 12px 32px rgb(15 23 42 / 0.12);
	}

	:global(.cs-group) {
		padding: 10px 12px 4px;
		color: var(--color-text-muted);
		font-size: var(--text-label);
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	:global(.cs-item) {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: var(--control-height);
		padding: 10px 12px;
		border-radius: 10px;
		cursor: pointer;
	}

	:global(.cs-item[data-highlighted]) {
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}

	.cs-meta {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.cs-empty {
		padding: 12px;
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}
</style>
