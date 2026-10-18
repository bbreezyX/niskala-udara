import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalArticle } from '@/components/legal-article';

export const metadata: Metadata = { title: 'Ketentuan Penggunaan', alternates: { canonical: '/terms' } };

export default function TermsPage() {
	return (
		<LegalArticle title="Ketentuan Penggunaan" updated="19 Oktober 2026">
			<h2>Layanan</h2>
			<p>
				Niskala menampilkan perkiraan kualitas udara terkini, kadar polutan, dan rekomendasi kesehatan umum untuk lokasi
				yang kamu pilih. Layanan ini gratis, tanpa akun, dan disediakan apa adanya.
			</p>

			<h2>Sumber data</h2>
			<p>
				Data berasal dari Google Maps Platform Air Quality API dan ditampilkan tanpa diubah. Data merupakan perkiraan per jam,
				dapat tertunda, tidak lengkap, atau berbeda dengan kondisi di lapangan.
			</p>

			<h2>Bukan nasihat medis</h2>
			<p>
				Informasi di situs ini bersifat umum. Untuk keputusan kesehatan, ikuti arahan tenaga kesehatan dan informasi resmi
				pemerintah setempat.
			</p>

			<h2>Ketentuan Google</h2>
			<p>
				Dengan menggunakan Niskala, kamu juga terikat pada{' '}
				<a href="https://maps.google.com/help/terms_maps/" rel="noopener noreferrer">
					Persyaratan Layanan Tambahan Google Maps/Google Earth
				</a>{' '}
				dan{' '}
				<a href="https://policies.google.com/privacy" rel="noopener noreferrer">
					Kebijakan Privasi Google
				</a>
				. Penggunaan Google Maps Platform oleh situs ini diatur oleh{' '}
				<a href="https://cloud.google.com/maps-platform/terms" rel="noopener noreferrer">
					Google Maps Platform Terms of Service
				</a>
				.
			</p>

			<h2>Privasi</h2>
			<p>
				Cara kami memproses lokasi dijelaskan di <Link href="/privacy">Kebijakan Privasi</Link>.
			</p>
		</LegalArticle>
	);
}
