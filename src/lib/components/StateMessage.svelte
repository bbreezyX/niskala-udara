<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description: string;
		tone?: 'neutral' | 'error';
		action?: Snippet;
	}

	let { title, description, tone = 'neutral', action }: Props = $props();
</script>

<div class="card message" class:error={tone === 'error'} role={tone === 'error' ? 'alert' : undefined}>
	<span class="icon" aria-hidden="true">
		{#if tone === 'error'}
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<circle cx="12" cy="12" r="9" />
				<path d="M12 7.5v5.5M12 16.5v.01" />
			</svg>
		{:else}
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
				<circle cx="12" cy="9.5" r="2.5" />
			</svg>
		{/if}
	</span>
	<h2>{title}</h2>
	<p>{description}</p>
	{#if action}
		<div class="action">{@render action()}</div>
	{/if}
</div>

<style>
	.message {
		display: grid;
		justify-items: center;
		gap: var(--space-1);
		padding: var(--space-4) var(--space-3);
		text-align: center;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		margin-bottom: var(--space-1);
		border-radius: 50%;
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}

	.error .icon {
		background: #fef2f2;
		color: var(--color-danger);
	}

	h2 {
		font-size: 1.125rem;
		font-weight: 600;
	}

	p {
		max-width: 44ch;
		color: var(--color-text-muted);
	}

	.action {
		margin-top: var(--space-1);
	}
</style>
