import type { Metadata } from 'next';
import { connection } from 'next/server';
import { HistoryView } from '@/components/history-view';
import { PageIntro } from '@/components/page-intro';
import { airQualityKey } from '@/lib/server/env';

export const metadata: Metadata = {
	title: 'Riwayat',
	alternates: { canonical: '/history' },
	description: 'Riwayat kualitas udara per jam untuk kota-kota pantauan.'
};

export default async function HistoryPage() {
	await connection();
	return (
		<div className="mx-auto grid max-w-7xl gap-6 px-4 pt-8 sm:px-6 md:pt-10">
			<PageIntro title="Riwayat kualitas udara" lead="Catatan per jam dari Google. Pilih baris untuk melihat detailnya." />
			<HistoryView configured={Boolean(airQualityKey())} />
		</div>
	);
}
