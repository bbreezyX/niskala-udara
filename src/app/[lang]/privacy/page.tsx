import type { Metadata } from 'next';
import { LegalArticle } from '@/components/legal-article';
import { toLocale } from '@/lib/i18n/config';
import { getDictionary, localeAlternates } from '@/lib/i18n/server';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const locale = toLocale((await params).lang);
	const page = getDictionary(locale).pages.privacy;
	return {
		title: page.title,
		alternates: localeAlternates('/privacy', locale)
	};
}

export default function PrivacyPage() {
	return (
		<LegalArticle title="Kebijakan Privasi" updated="19 Oktober 2026">
			<h2>Data yang diproses</h2>
			<p>
				Niskala hanya memproses koordinat lokasi untuk mengambil data kualitas udara. Saat kamu memilih kota, yang
				dikirim adalah koordinat titik referensi kota tersebut. Saat kamu menekan &quot;Gunakan lokasi saya&quot;, browser meminta
				izinmu terlebih dahulu, lalu koordinat perangkat dibulatkan menjadi sekitar 100 meter sebelum dikirim.
			</p>

			<h2>Ke mana data dikirim</h2>
			<p>
				Koordinat dikirim ke server Niskala, lalu diteruskan ke Google Maps Platform Air Quality API untuk mengambil
				kondisi udara terkini. Pemrosesan oleh Google tunduk pada{' '}
				<a href="https://policies.google.com/privacy" rel="noopener noreferrer">
					Kebijakan Privasi Google
				</a>
				.
			</p>

			<h2>Halaman Peta</h2>
			<p>
				Peta dimuat langsung dari Google Maps di browsermu, sehingga Google menerima data teknis seperti alamat IP dan dapat
				memakai cookie sesuai kebijakannya. Titik yang kamu klik di peta dibulatkan menjadi sekitar 100 meter, lalu dikirim
				lewat server Niskala ke Google untuk mengambil kualitas udara. Data hotspot diambil server dari NASA FIRMS tanpa
				data apa pun tentang dirimu.
			</p>

			<h2>Yang tidak kami lakukan</h2>
			<p>
				Kami tidak menyimpan koordinat atau hasil pencarianmu, tidak memasang cookie sendiri, tidak memerlukan akun, dan tidak
				memasang analitik atau iklan. Log server hanya mencatat informasi teknis seperti jenis galat dan durasi permintaan,
				tanpa koordinat.
			</p>

			<h2>Izin lokasi</h2>
			<p>
				Izin lokasi hanya diminta setelah kamu menekan tombol, dan dapat dicabut kapan saja melalui pengaturan browser. Tanpa
				izin tersebut, kamu tetap bisa memilih kota dari daftar.
			</p>
		</LegalArticle>
	);
}
