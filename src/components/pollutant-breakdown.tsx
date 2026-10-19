'use client';

import { formatConcentration, numberFormat, POLLUTANT_LABELS, unitLabel } from '@/lib/format';
import { fill, type Locale } from '@/lib/i18n/config';
import { POLLUTANT_CODES, type PollutantCode, type PollutantReading } from '@/lib/types';
import { whoRatio } from '@/lib/who';
import { cn } from '@/lib/utils';
import { PollutantHint } from './pollutant-tiles';
import { useDictionary, useLocale } from './locale-provider';

interface Props {
	pollutants: PollutantReading[];
	/** Google's dominant pollutant code (e.g. "pm25"), featured on top when it has a reading. */
	dominant: string | null;
}

function formatRatio(ratio: number, locale: Locale) {
	return `${ratio >= 10 ? Math.round(ratio) : numberFormat(locale, 1).format(ratio)}×`;
}

/**
 * Readings measured against the WHO guideline, so a raw number gains a reference: the dominant
 * pollutant is featured, the rest follow from furthest over the guideline to furthest under.
 */
export function PollutantBreakdown({ pollutants, dominant }: Props) {
	const t = useDictionary();
	const rows = POLLUTANT_CODES.map((code) => {
		const reading = pollutants.find((p) => p.code === code);
		return { code, reading, ratio: reading ? whoRatio(reading) : null };
	}).toSorted((a, b) => (b.ratio ?? -1) - (a.ratio ?? -1));

	const featured = rows.find((row) => row.code === dominant && row.reading) ?? null;
	const rest = rows.filter((row) => row !== featured);

	return (
		<div className="grid gap-3">
			{featured?.reading && <Featured code={featured.code} reading={featured.reading} ratio={featured.ratio} />}
			<dl className="grid @min-[640px]:grid-cols-2 @min-[640px]:gap-x-8">
				{rest.map(({ code, reading, ratio }) => (
					<Row key={code} code={code} reading={reading} ratio={ratio} />
				))}
			</dl>
			<p className="text-xs text-muted-foreground">
				{t.pollutants.whoNote}
			</p>
		</div>
	);
}

function Featured({ code, reading, ratio }: { code: PollutantCode; reading: PollutantReading; ratio: number | null }) {
	const locale = useLocale();
	const t = useDictionary();
	const over = ratio !== null && ratio > 1;
	return (
		<div className={cn('rounded-xl p-4', over ? 'bg-destructive/10 text-destructive' : 'bg-muted')}>
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
				<p>
					{t.pollutants.main} ·{' '}
					<PollutantHint code={code} units={reading.units}>
						<span className="cursor-help font-semibold underline decoration-current/40 decoration-dotted underline-offset-[3px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
							{POLLUTANT_LABELS[code]}
						</span>
					</PollutantHint>
				</p>
				{ratio !== null && (
					<p className="font-semibold tabular-nums">{over ? fill(t.pollutants.timesWho, { ratio: formatRatio(ratio, locale) }) : t.pollutants.belowWho}</p>
				)}
			</div>
			<p className="mt-1 text-3xl font-semibold tabular-nums">
				{formatConcentration(reading.value, locale)} <span className="text-sm font-normal">{unitLabel(reading.units)}</span>
			</p>
		</div>
	);
}

function Row({ code, reading, ratio }: { code: PollutantCode; reading?: PollutantReading; ratio: number | null }) {
	const locale = useLocale();
	const t = useDictionary();
	const over = ratio !== null && ratio > 1;
	return (
		<div className="grid grid-cols-[3.5rem_1fr_9.5rem] items-center gap-3 border-t py-2.5 text-sm">
			<dt>
				<PollutantHint code={code} units={reading?.units}>
					<span className="cursor-help font-semibold underline decoration-muted-foreground/50 decoration-dotted underline-offset-[3px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
						{POLLUTANT_LABELS[code]}
					</span>
				</PollutantHint>
			</dt>
			{/* The guideline sits at the middle of the track; anything at twice the guideline or more fills it. */}
			<div aria-hidden="true" className="relative h-1.5 rounded-full bg-muted">
				{ratio !== null && (
					<span
						className={cn('absolute inset-y-0 left-0 rounded-full', over ? 'bg-destructive' : 'bg-muted-foreground/40')}
						style={{ width: `${Math.min(ratio / 2, 1) * 100}%` }}
					/>
				)}
				<span className="absolute -inset-y-1 left-1/2 w-0.5 rounded-full bg-foreground/60" />
			</div>
			<dd className={cn('text-right tabular-nums', over && 'text-destructive')}>
				{reading ? (
					<>
						<span className="font-semibold">{formatConcentration(reading.value, locale)}</span>{' '}
						<span className="text-xs text-muted-foreground">{unitLabel(reading.units)}</span>
						{ratio !== null && (
							<span className="ml-2 text-xs">
								{formatRatio(ratio, locale)}
								<span className="sr-only">{t.pollutants.whoSuffix}</span>
							</span>
						)}
					</>
				) : (
					<span className="text-xs text-muted-foreground">{t.common.notAvailable}</span>
				)}
			</dd>
		</div>
	);
}
