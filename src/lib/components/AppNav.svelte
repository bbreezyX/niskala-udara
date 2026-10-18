<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const items = [
		{ href: resolve('/'), label: 'Pantauan', icon: 'grid' },
		{ href: resolve('/peta'), label: 'Peta', icon: 'map' },
		{ href: resolve('/riwayat'), label: 'Riwayat', icon: 'history' }
	] as const;
</script>

<nav class="nav" aria-label="Navigasi utama">
	<a class="brand" href={resolve('/')} aria-label="Niskala Udara, beranda">
		<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
			<rect width="32" height="32" rx="9" fill="currentColor" />
			<path d="M7 12h12a3 3 0 1 0-3-3M7 17h17a3 3 0 1 1-3 3M7 22h8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
		</svg>
		<span class="brand-name">Niskala Udara</span>
	</a>

	<ul>
		{#each items as item (item.href)}
			<li>
				<a href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						{#if item.icon === 'grid'}
							<rect x="3.5" y="3.5" width="7" height="7" rx="2" />
							<rect x="13.5" y="3.5" width="7" height="7" rx="2" />
							<rect x="3.5" y="13.5" width="7" height="7" rx="2" />
							<rect x="13.5" y="13.5" width="7" height="7" rx="2" />
						{:else if item.icon === 'map'}
							<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
							<path d="M9 4v14M15 6v14" />
						{:else}
							<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
							<path d="M3.5 4.5v4h4" />
							<path d="M12 7.5V12l3 2" />
						{/if}
					</svg>
					<span>{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.nav {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: 10px var(--space-2);
		background: rgb(255 255 255 / 0.92);
		border-bottom: 1px solid var(--color-border);
		backdrop-filter: blur(8px);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--color-primary);
		text-decoration: none;
	}

	.brand-name {
		color: var(--color-text);
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	ul {
		display: flex;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	ul a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--control-height);
		padding: 0 12px;
		border-radius: 10px;
		color: var(--color-text-muted);
		font-size: var(--text-label);
		font-weight: 600;
		text-decoration: none;
		transition:
			background-color var(--transition),
			color var(--transition);
	}

	ul a:hover {
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}

	ul a[aria-current='page'] {
		background: var(--color-primary);
		color: #fff;
	}

	@media (max-width: 419px) {
		.brand-name {
			display: none;
		}
	}

	/* Desktop: a floating icon rail, as in the reference layout. */
	@media (min-width: 1024px) {
		.nav {
			position: fixed;
			inset: var(--space-2) auto var(--space-2) var(--space-2);
			flex-direction: column;
			justify-content: flex-start;
			gap: var(--space-3);
			width: var(--rail-width);
			padding: var(--space-2) 0;
			border: 1px solid var(--color-border);
			border-radius: 20px;
			background: var(--color-surface);
			box-shadow: var(--shadow);
			backdrop-filter: none;
		}

		.brand-name {
			display: none;
		}

		ul {
			flex-direction: column;
			gap: var(--space-1);
		}

		ul a {
			flex-direction: column;
			justify-content: center;
			gap: 4px;
			width: 64px;
			min-height: 60px;
			padding: 0;
			font-size: var(--text-label);
		}
	}
</style>
