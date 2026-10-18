<svelte:head>
	<title>Privasi · Niskala Udara</title>
</svelte:head>

<article class="container legal">
	<h1>Kebijakan Privasi</h1>
	<p class="updated">Terakhir diperbarui: 19 Oktober 2026</p>

	<h2>Data yang diproses</h2>
	<p>
		Niskala Udara hanya memproses koordinat lokasi untuk mengambil data kualitas udara. Saat kamu memilih
		kota, yang dikirim adalah koordinat titik referensi kota tersebut. Saat kamu menekan "Gunakan lokasi
		saya", browser meminta izinmu terlebih dahulu, lalu koordinat perangkat dibulatkan menjadi sekitar 100
		meter sebelum dikirim.
	</p>

	<h2>Ke mana data dikirim</h2>
	<p>
		Koordinat dikirim ke server Niskala Udara, lalu diteruskan ke Google Maps Platform Air Quality API untuk
		mengambil kondisi udara terkini. Pemrosesan oleh Google tunduk pada
		<a href="https://policies.google.com/privacy" rel="noopener noreferrer">Kebijakan Privasi Google</a>.
	</p>

	<h2>Halaman Peta</h2>
	<p>
		Peta dimuat langsung dari Google Maps di browsermu, sehingga Google menerima data teknis seperti alamat IP
		dan dapat memakai cookie sesuai kebijakannya. Titik yang kamu klik di peta dibulatkan menjadi sekitar 100
		meter, lalu dikirim lewat server Niskala Udara ke Google untuk mengambil kualitas udara. Data hotspot
		diambil server dari NASA FIRMS tanpa data apa pun tentang dirimu.
	</p>

	<h2>Yang tidak kami lakukan</h2>
	<p>
		Kami tidak menyimpan koordinat atau hasil pencarianmu, tidak memasang cookie sendiri, tidak memerlukan akun, dan
		tidak memasang analitik atau iklan. Log server hanya mencatat informasi teknis seperti jenis galat dan
		durasi permintaan, tanpa koordinat.
	</p>

	<h2>Izin lokasi</h2>
	<p>
		Izin lokasi hanya diminta setelah kamu menekan tombol, dan dapat dicabut kapan saja melalui pengaturan
		browser. Tanpa izin tersebut, kamu tetap bisa memilih kota dari daftar.
	</p>
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
