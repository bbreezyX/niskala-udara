import { Link } from '@/components/link';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import { AboutHeader, AboutSection } from './about-section';
import { BandsFigure } from './bands-figure';

export function AboutId({ bandNames }: { bandNames: Dictionary['aqi']['bands'] }) {
	return (
		<>
			<AboutHeader title="Tentang Niskala">
				Udara itu <em>niskala</em>, tak kasat mata. Niskala membuatnya terbaca: kualitas udara terkini, prakiraan 24
				jam, dan riwayat per jam untuk kota-kota di Indonesia, tanpa akun dan tanpa iklan.
			</AboutHeader>

			<AboutSection id="reading-aqi" title="Cara membaca angka AQI">
				<p className="max-w-prose">
					Angka utama di aplikasi ini adalah <strong className="font-semibold text-foreground">Universal AQI</strong> dari
					Google. Indeks ini dihitung dari kadar beberapa polutan dan memakai skala 0–100:{' '}
					<strong className="font-semibold text-foreground">semakin tinggi angkanya, semakin baik udaranya</strong>. Nama
					kategori dan rekomendasi kesehatan berasal langsung dari Google.
				</p>

				<BandsFigure names={bandNames}>
					Pita kategori Universal AQI. Warna mengikuti warna yang dikirim Google untuk setiap angka.
				</BandsFigure>
			</AboutSection>

			<AboutSection id="bukan-ispu" title="Universal AQI bukan ISPU">
				<p className="max-w-prose">
					ISPU, indeks resmi pemerintah Indonesia, menunjukkan kualitas udara yang semakin buruk saat angkanya semakin tinggi.
					Kedua indeks memakai arah dan skala yang berbeda sehingga angkanya tidak dapat dibandingkan langsung. AQI 80 berarti udara sangat
					baik; ISPU 80 berarti udara sedang.
				</p>
			</AboutSection>

			<AboutSection id="sumber-data" title="Sumber data">
				<p className="max-w-prose">
					Kondisi terkini, prakiraan, riwayat, dan peta panas kualitas udara berasal dari Google Maps Platform Air Quality
					API. Data hotspot di halaman Peta berasal dari{' '}
					<a href="https://firms.modaps.eosdis.nasa.gov/" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
						NASA FIRMS
					</a>{' '}
					(satelit VIIRS), yaitu anomali panas yang belum tentu kebakaran. Arah angin di peta adalah prakiraan model cuaca
					dari{' '}
					<a href="https://open-meteo.com/" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
						Open-Meteo
					</a>{' '}
					(CC BY 4.0).
				</p>
				<p className="max-w-prose">
					Setiap kota memakai satu titik referensi: pusat kota untuk kota, dan ibu kota kabupaten untuk kabupaten. Kondisi di
					bagian lain wilayah tersebut bisa berbeda.
				</p>
			</AboutSection>

			<AboutSection id="batasan" title="Batasan">
				<p className="max-w-prose">
					Data merupakan perkiraan model per jam, bukan hasil satu alat ukur di titik tersebut, dan bisa tertunda atau tidak
					lengkap. Gunakan sebagai gambaran umum, bukan nasihat medis. Untuk keputusan kesehatan, ikuti arahan tenaga
					kesehatan dan informasi resmi pemerintah setempat.
				</p>
				<p className="max-w-prose">
					Pemrosesan lokasi dijelaskan dalam{' '}
					<Link href="/privacy" className="text-primary underline underline-offset-4">
						Kebijakan Privasi
					</Link>
					, dan aturan pemakaian di{' '}
					<Link href="/terms" className="text-primary underline underline-offset-4">
						Ketentuan Penggunaan
					</Link>
					.
				</p>
			</AboutSection>
		</>
	);
}
