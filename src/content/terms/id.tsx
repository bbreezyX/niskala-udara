import { Link } from '@/components/link';
import type { LegalSection } from '../legal-sections';

/** Indonesian original. It prevails over the English translation. */
export const TERMS_ID: LegalSection[] = [
	{
		title: 'Layanan',
		body: (
			<>
				Niskala menampilkan perkiraan kualitas udara terkini, kadar polutan, dan rekomendasi kesehatan umum untuk lokasi
				pilihan. Layanan ini gratis, tanpa akun, dan disediakan apa adanya.
			</>
		)
	},
	{
		title: 'Sumber Data',
		body: (
			<>
				Data kualitas udara berasal dari Google Maps Platform Air Quality API dan ditampilkan tanpa diubah. Hotspot berasal
				dari NASA FIRMS, dan angin di peta dari Open-Meteo (CC BY 4.0). Data merupakan perkiraan per jam,
				dapat tertunda, tidak lengkap, atau berbeda dengan kondisi di lapangan.
			</>
		)
	},
	{
		title: 'Bukan Nasihat Medis',
		body: (
			<>
				Informasi di situs ini bersifat umum. Untuk keputusan kesehatan, ikuti arahan tenaga kesehatan dan informasi resmi
				pemerintah setempat.
			</>
		)
	},
	{
		title: 'Ketentuan Google',
		body: (
			<>
				Pengguna Niskala juga terikat pada{' '}
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
			</>
		)
	},
	{
		title: 'Privasi',
		body: (
			<>
				Pemrosesan lokasi dijelaskan dalam <Link href="/privacy">Kebijakan Privasi</Link>.
			</>
		)
	}
];
