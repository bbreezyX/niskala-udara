'use client';

import { pollutantLabel } from '@/lib/format';
import type { HistorySummary } from '@/lib/history';
import { fill, plural } from '@/lib/i18n/config';
import { useDictionary, useLocale } from './locale-provider';

/** Which pollutant set the AQI most often across the range. */
export function DominantTile({ dominant, total }: { dominant: HistorySummary['dominant']; total: number }) {
	const locale = useLocale();
	const t = useDictionary();
	const copy = t.history.dominant;
	const main = dominant[0];

	return (
		<section aria-labelledby="history-dominant" className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
			<h2 id="history-dominant" className="text-sm font-semibold text-muted-foreground">
				{copy.title}
			</h2>
			{main ? (
				<>
					<p className="text-4xl font-semibold tracking-tight">{pollutantLabel(main.code)}</p>
					<p className="body-copy">{fill(copy.share, { count: String(main.count), total: String(total) })}</p>
					<ul className="mt-auto grid gap-2">
						{dominant.map(({ code, count }) => (
							<li key={code} className="flex items-center gap-2.5 text-sm">
								<span className="w-14 shrink-0 font-semibold">{pollutantLabel(code)}</span>
								<span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
									<span className="block h-full rounded-full bg-primary" style={{ width: `${(count / total) * 100}%` }} />
								</span>
								<span className="w-16 shrink-0 text-right text-muted-foreground tabular-nums">{plural(t.history.hours, count, locale)}</span>
							</li>
						))}
					</ul>
				</>
			) : (
				<p className="body-copy text-muted-foreground">{t.common.notAvailable}</p>
			)}
		</section>
	);
}
