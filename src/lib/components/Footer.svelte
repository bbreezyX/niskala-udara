<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<footer>
	<div class="container inner">
		<p>Niskala Udara · Data kualitas udara dari Google</p>
		<nav aria-label="Informasi hukum">
			<a href={resolve('/privasi')}>Privasi</a>
			<a href={resolve('/ketentuan')}>Ketentuan Penggunaan</a>
		</nav>
	</div>
</footer>

<style>
	footer {
		margin-top: var(--space-4);
		border-top: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}

	.inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
		padding-block: var(--space-3);
	}

	nav {
		display: flex;
		gap: var(--space-3);
	}

	nav a {
		display: inline-flex;
		align-items: center;
		min-height: var(--control-height);
	}
</style>
