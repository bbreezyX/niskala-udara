<script lang="ts">
	let { text }: { text: string | null } = $props();
</script>

<section class="insight" class:empty={!text}>
	<h3>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M12 21s-7-4.4-7-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 16.6 12 21 12 21Z" />
		</svg>
		Rekomendasi kesehatan
	</h3>
	<p class="audience">Untuk masyarakat umum</p>
	<p class="text">{text ?? 'Rekomendasi belum tersedia untuk lokasi ini.'}</p>
</section>

<style>
	.insight {
		padding: var(--space-2);
		border: 1px solid #bfdbfe;
		border-radius: 12px;
		background: var(--color-primary-soft);
	}

	.empty {
		border-color: var(--color-border);
		background: var(--color-surface-muted);
	}

	h3 {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: #1e3a8a;
		font-size: 1rem;
		font-weight: 600;
	}

	.empty h3 {
		color: var(--color-text);
	}

	.audience {
		margin: 2px 0 var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.text {
		max-width: 68ch;
		font-size: var(--text-body);
	}

	.empty .text {
		color: var(--color-text-muted);
	}
</style>
