<script lang="ts">
	import '../app.css';
	import AppNav from '#lib/components/AppNav.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<a class="skip-link" href="#konten">Lewati ke konten</a>
<div class="shell">
	<AppNav />
	<div class="column">
		<main id="konten" tabindex="-1">
			{@render children()}
		</main>
		<Footer />
	</div>
</div>

<style>
	.skip-link {
		position: absolute;
		left: var(--space-2);
		top: -100px;
		z-index: 50;
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}

	.skip-link:focus {
		top: var(--space-1);
	}

	main {
		outline: none;
	}

	.column {
		min-width: 0;
	}

	@media (min-width: 1024px) {
		.column {
			padding-left: calc(var(--rail-width) + var(--space-2));
		}
	}
</style>
