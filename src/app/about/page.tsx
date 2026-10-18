import type { Metadata } from 'next';
import Link from 'next/link';
import { AQI_BANDS, UAQI_GRADIENT } from '@/lib/aqi';

export const metadata: Metadata = {
	title: 'Tentang',
	alternates: { canonical: '/about' },
	description: 'Apa itu Niskala, cara membaca Universal AQI, sumber data, dan batasannya.'
};

const RANGES = AQI_BANDS.map((band, i) => ({ ...band, max: (AQI_BANDS[i + 1]?.min ?? 101) - 1 }));

export default function AboutPage() {
	return (
		<article className="mx-auto grid max-w-3xl gap-12 px-4 pt-10 sm:px-6 md:pt-14 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-foreground/85">
			<header>
				<h1 className="font-display text-5xl leading-none tracking-[-0.02em] sm:text-6xl">Tentang Niskala</h1>
				<p className="mt-4 max-w-prose text-lg">
					Udara itu <em>niskala</em>, tak kasat mata. Niskala membuatnya terbaca: kualitas udara terkini, prakiraan 24
					jam, dan riwayat per jam untuk kota-kota di Indonesia, tanpa akun dan tanpa iklan.
				</p>
			</header>

			<section aria-labelledby="reading-aqi" className="grid gap-4">
				<h2 id="reading-aqi">Cara membaca angka AQI</h2>
				<p className="max-w-prose">
					Angka utama di aplikasi ini adalah <strong className="font-semibold text-foreground">Universal AQI</strong> dari
					Google. Indeks ini dihitung dari kadar beberapa polutan dan memakai skala 0–100:{' '}
					<strong className="font-semibold text-foreground">semakin tinggi angkanya, semakin baik udaranya</strong>. Nama
					kategori dan rekomendasi kesehatan berasal langsung dari Google.
				</p>

				<figure className="m-0 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
					<div className="h-3 rounded-full" style={{ background: UAQI_GRADIENT }} aria-hidden="true" />
					<div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums" aria-hidden="true">
						<span>0</span>
						<span>50</span>
						<span>100</span>
					</div>
					<dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
						{RANGES.map(({ label, icon: Icon, ink, min, max }) => (
							<div key={min} className="grid content-start gap-1 rounded-xl bg-muted/60 p-3">
								<dt className="flex items-center gap-1.5 text-sm font-semibold">
									<Icon className="size-4 shrink-0" style={{ color: ink }} aria-hidden="true" />
									{label}
								</dt>
								<dd className="text-sm text-muted-foreground tabular-nums">
									{min}–{max}
								</dd>
							</div>
						))}
					</dl>
					<figcaption className="mt-4 text-xs text-muted-foreground">
						Pita kategori Universal AQI. Warna mengikuti warna yang dikirim Google untuk setiap angka.
					</figcaption>
				</figure>
			</section>

			<section aria-labelledby="bukan-ispu" className="grid gap-4">
				<h2 id="bukan-ispu">Universal AQI bukan ISPU</h2>
				<p className="max-w-prose">
					ISPU, indeks resmi pemerintah Indonesia, justru makin buruk saat angkanya makin tinggi. Kedua indeks memakai arah
					dan skala yang berbeda, jadi jangan membandingkan angkanya secara langsung. AQI 80 di sini berarti udara sangat
					baik; ISPU 80 berarti udara sedang.
				</p>
			</section>

			<section aria-labelledby="sumber-data" className="grid gap-4">
				<h2 id="sumber-data">Sumber data</h2>
				<p className="max-w-prose">
					Kondisi terkini, prakiraan, riwayat, dan peta panas kualitas udara berasal dari Google Maps Platform Air Quality
					API. Data hotspot di halaman Peta berasal dari{' '}
					<a href="https://firms.modaps.eosdis.nasa.gov/" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
						NASA FIRMS
					</a>{' '}
					(satelit VIIRS), yaitu anomali panas yang belum tentu kebakaran.
				</p>
				<p className="max-w-prose">
					Setiap kota memakai satu titik referensi: pusat kota untuk kota, dan ibu kota kabupaten untuk kabupaten. Kondisi di
					bagian lain wilayah tersebut bisa berbeda.
				</p>
			</section>

			<section aria-labelledby="batasan" className="grid gap-4">
				<h2 id="batasan">Batasan</h2>
				<p className="max-w-prose">
					Data merupakan perkiraan model per jam, bukan hasil satu alat ukur di titik tersebut, dan bisa tertunda atau tidak
					lengkap. Gunakan sebagai gambaran umum, bukan nasihat medis. Untuk keputusan kesehatan, ikuti arahan tenaga
					kesehatan dan informasi resmi pemerintah setempat.
				</p>
				<p className="max-w-prose">
					Cara kami memproses lokasi dijelaskan di{' '}
					<Link href="/privacy" className="text-primary underline underline-offset-4">
						Kebijakan Privasi
					</Link>
					, dan aturan pemakaian di{' '}
					<Link href="/terms" className="text-primary underline underline-offset-4">
						Ketentuan Penggunaan
					</Link>
					.
				</p>
			</section>
		</article>
	);
}
