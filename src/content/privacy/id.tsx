import type { LegalSection } from '../legal-sections';

/** Indonesian original. It prevails over the English translation. */
export const PRIVACY_ID: LegalSection[] = [
	{
		title: 'Data yang Diproses',
		body: (
			<>
				Niskala hanya memproses koordinat lokasi untuk mengambil data kualitas udara. Untuk kota yang dipilih, koordinat
				yang dikirim adalah titik referensi kota tersebut. Setelah tombol &quot;Gunakan Lokasi Perangkat&quot; dipilih, browser
				meminta izin akses lokasi. Koordinat perangkat kemudian dibulatkan menjadi sekitar 100 meter sebelum dikirim.
			</>
		)
	},
	{
		title: 'Ke Mana Data Dikirim',
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
				Peta dimuat langsung dari Google Maps di browser, sehingga Google menerima data teknis seperti alamat IP dan dapat
				menggunakan cookie sesuai kebijakannya. Titik yang dipilih di peta dibulatkan menjadi sekitar 100 meter, lalu dikirim
				melalui server Niskala ke Google untuk mengambil data kualitas udara. Server mengambil data hotspot dari NASA FIRMS
				dan data angin dari Open-Meteo tanpa mengirimkan data tentang pengguna ke kedua penyedia tersebut.
			</>
		)
	},
	{
		title: 'Penyimpanan pada Perangkat',
		body: (
			<>
				Browser menyimpan wilayah terakhir yang dipilih, atau wilayah terdekat setelah penggunaan tombol
				&quot;Gunakan Lokasi Perangkat&quot;, agar Pantauan langsung membuka wilayah tersebut. Penyimpanan lokal browser
				(localStorage) hanya berisi nama wilayah, misalnya Riau, tanpa koordinat. Data ini tidak dikirim ke server dan
				bukan cookie. Untuk menghapusnya, bersihkan data situs melalui pengaturan browser.
			</>
		)
	},
	{
		title: 'Batas Pengumpulan Data',
		body: (
			<>
				Niskala tidak menyimpan koordinat atau hasil pencarian, tidak memasang cookie sendiri, tidak memerlukan akun, dan
				tidak memasang analitik atau iklan. Log server hanya mencatat informasi teknis seperti jenis galat dan durasi
				permintaan, tanpa koordinat.
			</>
		)
	},
	{
		title: 'Izin Lokasi',
		body: (
			<>
				Izin lokasi hanya diminta setelah tombol &quot;Gunakan Lokasi Perangkat&quot; dipilih. Izin dapat dicabut kapan saja
				melalui pengaturan browser. Pemilihan kota dari daftar tetap tersedia tanpa izin lokasi.
			</>
		)
	}
];
