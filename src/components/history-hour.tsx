'use client';

import type { Ref } from 'react';
import { aqiBand } from '@/lib/aqi';
import { formatDataTime } from '@/lib/format';
import type { AirQualityData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AqiBadge } from './aqi-badge';
import { useDictionary, useLocale } from './locale-provider';
import { PollutantBreakdown } from './pollutant-breakdown';

interface Props {
	hour: AirQualityData;
	timeZone: string;
	isLatest: boolean;
	onBack: () => void;
	ref?: Ref<HTMLElement>;
}

/** One hour in full: its AQI and its pollutant levels against the WHO guidelines. */
export function HourTile({ hour, timeZone, isLatest, onBack, ref }: Props) {
	const locale = useLocale();
	const t = useDictionary();
	const copy = t.history.hour;

	return (
		<section
			ref={ref}
			aria-labelledby="history-hour"
			className="@container grid scroll-mt-20 content-start gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
		>
			<div className="grid gap-3">
				{/* Picking another hour from the table keeps focus there, so the new hour is announced instead. */}
				<div aria-live="polite" className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
					<div className="grid gap-1">
						<h2 id="history-hour" className="panel-title">
							{isLatest ? copy.latest : copy.picked}
						</h2>
						<p className="text-sm text-muted-foreground">
							<time dateTime={hour.dataTime}>{formatDataTime(hour.dataTime, timeZone, locale)}</time>
						</p>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-4xl font-semibold tracking-tight tabular-nums" style={{ color: aqiBand(hour.index.aqi).ink }}>
							{hour.index.aqiDisplay}
						</span>
						<AqiBadge aqi={hour.index.aqi} category={hour.index.category} color={hour.index.color} />
					</div>
				</div>
				{isLatest ? (
					<p className="text-sm text-muted-foreground">{copy.hint}</p>
				) : (
					<Button variant="outline" size="lg" className="justify-self-start" onClick={onBack}>
						{copy.back}
					</Button>
				)}
			</div>
			<div className="grid gap-3">
				<h3 className="font-semibold">{t.pollutants.levelsThisHour}</h3>
				<PollutantBreakdown pollutants={hour.pollutants} dominant={hour.index.dominantPollutant} />
			</div>
		</section>
	);
}
