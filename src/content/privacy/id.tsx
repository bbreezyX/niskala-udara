import type { LegalSection } from '../legal-sections';

/** Indonesian original. It prevails over the English translation. */
export const PRIVACY_ID: LegalSection[] = [
	{
		title: 'Data yang diproses',
		body: (
			<>
				Niskala hanya memproses koordinat lokasi untuk mengambil data kualitas udara. Saat kamu memilih kota, yang
				dikirim adalah koordinat titik referensi kota tersebut. Saat kamu menekan &quot;Gunakan lokasi saya&quot;, browser meminta
				izinmu terlebih dahulu, lalu koordinat perangkat dibulatkan menjadi sekitar 100 meter sebelum dikirim.
			</>
		)
	},
	{
		title: 'Ke mana data dikirim',
		body: (
			<>
				Koordinat dikirim ke server Niskala, lalu diteruskan ke Google Maps Platform Air Quality API untuk mengambil
				kondisi udara terkini. Pemrosesan oleh Google tunduk pada{' '}
				<a href="https://policies.google.com/privacy" rel="noopener noreferrer">
					Kebijakan Privasi Google
				</a>
				.
			</>
		)
	},
	{
		title: 'Halaman Peta',
		body: (
			<>
				Peta dimuat langsung dari Google Maps di browsermu, sehingga Google menerima data teknis seperti alamat IP dan dapat
				memakai cookie sesuai kebijakannya. Titik yang kamu klik di peta dibulatkan menjadi sekitar 100 meter, lalu dikirim
				lewat server Niskala ke Google untuk mengambil kualitas udara. Data hotspot diambil server dari NASA FIRMS tanpa
				data apa pun tentang dirimu.
			</>
		)
	},
	{
		title: 'Yang tidak kami lakukan',
		body: (
			<>
				Kami tidak menyimpan koordinat atau hasil pencarianmu, tidak memasang cookie sendiri, tidak memerlukan akun, dan tidak
				memasang analitik atau iklan. Log server hanya mencatat informasi teknis seperti jenis galat dan durasi permintaan,
				tanpa koordinat.
			</>
		)
	},
	{
		title: 'Izin lokasi',
		body: (
			<>
				Izin lokasi hanya diminta setelah kamu menekan tombol, dan dapat dicabut kapan saja melalui pengaturan browser. Tanpa
				izin tersebut, kamu tetap bisa memilih kota dari daftar.
			</>
		)
	}
];
