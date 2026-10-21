'use client';

import { RotateCw } from 'lucide-react';
import { useSmokeTrace } from '@/lib/client/use-smoke-trace';
import { formatDataTime, numberFormat } from '@/lib/format';
import { fill } from '@/lib/i18n/config';
import { TRACE_HOURS } from '@/lib/smoke-trace';
import { compassPoint, traceSentence } from '@/lib/smoke-trace-copy';
import type { AirQualityData, Coordinates, SmokeTrace } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDictionary, useLocale } from './locale-provider';
import { SmokeTraceFigure } from './smoke-trace-figure';

interface Props {
	coordinates: Coordinates;
	current: AirQualityData;
	timeZone: string;
}

/** "What is causing it": where the air came from over the last hours and the fires on the way. */
export function SmokeTraceCard({ coordinates, current, timeZone }: Props) {
	const t = useDictionary();
	const [trace, retry] = useSmokeTrace(coordinates);
	const hours = trace.status === 'success' ? trace.data.hours : TRACE_HOURS;

	return (
		<Card className="rounded-[20px] lg:col-span-12" aria-busy={trace.status === 'loading' || (trace.status === 'success' && trace.refreshing)}>
			<CardHeader>
				<CardTitle>{fill(t.smokeTrace.title, { hours: String(hours) })}</CardTitle>
			</CardHeader>
			<CardContent>
				{trace.status === 'success' ? (
					<TraceBody trace={trace.data} current={current} timeZone={timeZone} />
				) : trace.status === 'error' ? (
					trace.code === 'not_configured' ? (
						<p className="body-copy text-muted-foreground">{t.smokeTrace.unconfigured}</p>
					) : (
						<div className="grid justify-items-start gap-3">
							<p className="text-sm font-semibold text-destructive">{t.smokeTrace.failed}</p>
							<Button variant="outline" size="lg" onClick={retry}>
								<RotateCw data-icon="inline-start" />
								{t.common.retry}
							</Button>
						</div>
					)
				) : (
					<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
						<div className="grid content-start gap-3">
							<Skeleton className="h-16 rounded-lg" />
							<Skeleton className="h-20 rounded-xl" />
						</div>
						<Skeleton className="aspect-square w-full max-w-[22rem] justify-self-center rounded-full" />
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function TraceBody({ trace, current, timeZone }: { trace: SmokeTrace; current: AirQualityData; timeZone: string }) {
	const t = useDictionary();
	const locale = useLocale();
	const number = numberFormat(locale, 0);
	const sentence = traceSentence(trace, { aqi: current.index.aqi, dominantPollutant: current.index.dominantPollutant }, t, locale);
	const group = trace.mainGroup;
	const facts = [
		{ label: t.smokeTrace.facts.hotspots, value: number.format(trace.count) },
		{ label: t.smokeTrace.facts.power, value: fill(t.smokeTrace.facts.powerValue, { mw: number.format(trace.totalFrp) }) },
		...(group
			? [
					{
						label: t.smokeTrace.facts.group,
						value: fill(t.smokeTrace.facts.groupValue, {
							km: String(group.distanceKm),
							direction: t.map.compass[compassPoint(group.bearing)],
							hours: String(group.hoursBack)
						}),
						wide: true
					}
				]
			: [])
	];

	// From lg the figure takes a side column; on phones it follows the text it illustrates.
	return (
		<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
			<div className="grid content-start gap-4">
				<p className="body-copy">{sentence}</p>
				{/* Hairlines from 1px gaps over a border-coloured backdrop, as in the trend card's stats. */}
				<dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
					{facts.map(({ label, value, wide }) => (
						<div key={label} className={cn('grid content-start gap-0.5 bg-card px-3 py-3 sm:px-4', wide && 'col-span-2 sm:col-span-1')}>
							<dt className="meta-copy font-semibold text-muted-foreground">{label}</dt>
							<dd className="text-base font-semibold tabular-nums">{value}</dd>
						</div>
					))}
				</dl>
				<p className="meta-copy grid gap-1 text-muted-foreground">
					<span>{t.smokeTrace.method}</span>
					<span>
						{fill(t.smokeTrace.dataTimes, {
							wind: formatDataTime(trace.windFetchedAt, timeZone, locale),
							fires: formatDataTime(trace.firesFetchedAt, timeZone, locale)
						})}
					</span>
					{trace.missingFireSources.length > 0 && <span>{t.map.missingSources}</span>}
				</p>
			</div>
			<SmokeTraceFigure trace={trace} />
		</div>
	);
}
