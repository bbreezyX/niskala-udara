<script lang="ts">
	let { category, color }: { category: string | null; color: string | null } = $props();
</script>

<span class="badge">
	{#if color}
		<span class="dot" style:background-color={color} aria-hidden="true"></span>
	{/if}
	{category ?? 'Kategori belum tersedia'}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 3px 10px;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-label);
		font-weight: 600;
		line-height: 1.4;
	}

	.dot {
		width: 8px;
		height: 8px;
		flex-shrink: 0;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.12);
	}
</style>
