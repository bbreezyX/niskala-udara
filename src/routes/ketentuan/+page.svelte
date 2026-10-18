<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Ketentuan Penggunaan · Niskala Udara</title>
</svelte:head>

<article class="container legal">
	<h1>Ketentuan Penggunaan</h1>
	<p class="updated">Terakhir diperbarui: 19 Oktober 2026</p>

	<h2>Layanan</h2>
	<p>
		Niskala Udara menampilkan perkiraan kualitas udara terkini, kadar polutan, dan rekomendasi kesehatan
		umum untuk lokasi yang kamu pilih. Layanan ini gratis, tanpa akun, dan disediakan apa adanya.
	</p>

	<h2>Sumber data</h2>
	<p>
		Data berasal dari Google Maps Platform Air Quality API dan ditampilkan tanpa diubah. Data merupakan
		perkiraan per jam, dapat tertunda, tidak lengkap, atau berbeda dengan kondisi di lapangan.
	</p>

	<h2>Bukan nasihat medis</h2>
	<p>
		Informasi di situs ini bersifat umum. Untuk keputusan kesehatan, ikuti arahan tenaga kesehatan dan
		informasi resmi pemerintah setempat.
	</p>

	<h2>Ketentuan Google</h2>
	<p>
		Dengan menggunakan Niskala Udara, kamu juga terikat pada
		<a href="https://maps.google.com/help/terms_maps/" rel="noopener noreferrer"
			>Persyaratan Layanan Tambahan Google Maps/Google Earth</a
		>
		dan
		<a href="https://policies.google.com/privacy" rel="noopener noreferrer">Kebijakan Privasi Google</a>.
		Penggunaan Google Maps Platform oleh situs ini diatur oleh
		<a href="https://cloud.google.com/maps-platform/terms" rel="noopener noreferrer"
			>Google Maps Platform Terms of Service</a
		>.
	</p>

	<h2>Privasi</h2>
	<p>Cara kami memproses lokasi dijelaskan di <a href={resolve("/privasi")}>Kebijakan Privasi</a>.</p>
</article>

<style>
	.legal {
		display: grid;
		gap: var(--space-2);
		max-width: calc(720px + 2 * var(--space-2));
		padding-top: var(--space-4);
	}

	h1 {
		font-size: var(--text-title);
		font-weight: 700;
	}

	h2 {
		margin-top: var(--space-2);
		font-size: 1.125rem;
		font-weight: 600;
	}

	.updated {
		color: var(--color-text-muted);
		font-size: var(--text-label);
	}
</style>
