'use client';

import { AQI_BANDS, aqiBand, aqiBandIndex, bandEdge, tint } from '@/lib/aqi';
import type { HistoryRange } from '@/lib/coordinates';
import { formatDay, formatHour } from '@/lib/format';
import type { HistorySummary } from '@/lib/history';
import { fill, plural } from '@/lib/i18n/config';
import { AqiBadge } from './aqi-badge';
import { useDictionary, useLocale } from './locale-provider';

interface Props {
	summary: HistorySummary;
	range: HistoryRange;
	/** Hours with a reading. */
	total: number;
	timeZone: string;
}

/** The range in one number and one sentence, with a waffle of every hour by category below. */
export function SummaryTile({ summary, range, total, timeZone }: Props) {
	const locale = useLocale();
	const t = useDictionary();
	const copy = t.history.summary;
	const names = t.aqi.bands;
	const meanBand = aqiBand(summary.mean);

	const topCount = summary.bands.find((band) => band.key === summary.top)?.count ?? 0;
	const verdict = fill(copy.verdict, { band: names[summary.top], count: String(topCount), total: String(total) });
	const bestIndex = aqiBandIndex(summary.best.index.aqi);
	const reach =
		bestIndex < AQI_BANDS.length - 1
			? fill(copy.ceiling, { band: names[AQI_BANDS[bestIndex + 1].key].toLowerCase() })
			: fill(copy.peak, {
					band: names[AQI_BANDS[bestIndex].key].toLowerCase(),
					time: `${formatDay(summary.best.dataTime, timeZone, locale)} ${formatHour(summary.best.dataTime, timeZone, locale)}`
				});

	const squares = summary.bands.flatMap(({ key, count }) => {
		const band = AQI_BANDS.find((b) => b.key === key) ?? AQI_BANDS[0];
		return Array.from({ length: count }, (_, n) => ({ id: `${key}-${n}`, band }));
	});

	return (
		<section
			aria-labelledby="history-average"
			className="flex flex-col gap-5 rounded-2xl p-5 ring-1 ring-foreground/10 sm:p-6"
			style={{ background: tint(meanBand.fill, 9) }}
		>
			<h2 id="history-average" className="text-sm font-semibold text-muted-foreground">
				{fill(copy.average, { n: String(range) })}
			</h2>
			<div className="flex flex-wrap items-end gap-x-4 gap-y-2">
				<p className="text-7xl leading-none font-semibold tracking-tight tabular-nums" style={{ color: meanBand.ink }}>
					{summary.mean}
				</p>
				<div className="grid justify-items-start gap-1.5 pb-1">
					<AqiBadge aqi={summary.mean} category={null} color={meanBand.fill} />
					<p className="text-sm text-muted-foreground">{t.common.scale}</p>
				</div>
			</div>
			<p className="body-copy text-pretty">
				{verdict} {reach}
			</p>
			<div className="mt-auto grid gap-2.5">
				<p className="flex justify-between gap-3 text-sm text-muted-foreground">
					<span>{copy.waffle}</span>
					<span className="tabular-nums">{plural(t.history.hours, total, locale)}</span>
				</p>
				<div aria-hidden="true" className="grid grid-cols-24 gap-[3px]">
					{squares.map(({ id, band }) => (
						<span key={id} className="aspect-square rounded-[3px]" style={{ background: band.fill, boxShadow: bandEdge(band) }} />
					))}
				</div>
				<ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
					{summary.bands.map(({ key, count }) => {
						const band = AQI_BANDS.find((b) => b.key === key) ?? AQI_BANDS[0];
						return (
							<li key={key} className="flex items-center gap-2">
								<span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: band.fill, boxShadow: bandEdge(band) }} />
								{names[key]} <strong className="font-semibold tabular-nums">{plural(t.history.hours, count, locale)}</strong>
							</li>
						);
					})}
				</ul>
			</div>
		</section>
	);
}
