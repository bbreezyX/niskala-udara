'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, MapPin, RotateCw } from 'lucide-react';
import { postJson, toRemote, withLanguage, type Remote } from '@/lib/client/api';
import { isBusy, needsLoad, useFeed, useFeeds, type LocationFeed } from '@/lib/client/location-feed';
import { aqiBand, bandEdge } from '@/lib/aqi';
import { dateTimeFormat } from '@/lib/date-format';
import { fill, plural } from '@/lib/i18n/config';
import { formatDataTime, formatDay, formatHour, pollutantLabel, timeZoneLabel } from '@/lib/format';
import type { AirQualityData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AqiBadge } from './aqi-badge';
import { AqiGauge } from './aqi-gauge';
import { Attribution, Recommendation, StateMessage } from './info-blocks';
import { PollutantBreakdown } from './pollutant-breakdown';
import { TrendChart, type TrendPoint } from './trend-chart';
import { Link } from './link';
import { useDictionary, useLocale } from './locale-provider';

export interface RelatedPlace {
	href: string;
	name: string;
	current: boolean;
	/** The place's session feed: its reading shows only if already loaded; this list never fetches. */
	feed: LocationFeed;
}

interface Props {
	feed: LocationFeed;
	configured: boolean;
	back: { href: string; label: string };
	/** Shown under the name in place of the location's note, e.g. the province. */
	region?: string;
	related?: RelatedPlace[];
}

/** The feed plus its past 24 h, kept in step: a refresh renews both. */
function useLocationData(feed: LocationFeed, configured: boolean) {
	const state = useFeed(feed);
	const [history, setHistory] = useState<Remote<AirQualityData[]>>({ status: 'idle' });
	const [historyVersion, setHistoryVersion] = useState(0);

	useEffect(() => {
		if (configured && needsLoad(feed)) feed.load();
	}, [configured, feed]);

	// Past 24 h for the trend and the summary; a newer location or refresh aborts the older request.
	useEffect(() => {
		if (!configured) return;
		const controller = new AbortController();
		setHistory({ status: 'loading' });
		postJson<AirQualityData[]>(withLanguage('/api/air-quality/history', feed.language), { ...feed.location.coordinates, hours: 24 }, controller.signal).then((result) => {
			if (result) setHistory(toRemote(result));
		});
		return () => controller.abort();
	}, [configured, feed, historyVersion]);

	const past = useMemo(() => (history.status === 'success' ? history.data : []), [history]);
	const future = useMemo(() => (state.forecast.status === 'success' ? state.forecast.data : []), [state.forecast]);

	const trend = useMemo((): TrendPoint[] => {
		const lastPast = past.at(-1)?.dataTime;
		return [
			...past.map((h) => ({ dateTime: h.dataTime, aqi: h.index.aqi })),
			...future.filter((h) => !lastPast || h.dataTime > lastPast).map((h) => ({ dateTime: h.dataTime, aqi: h.index.aqi, forecast: true }))
		];
	}, [past, future]);

	const busy = isBusy(state);

	function refresh() {
		if (busy || !configured) return;
		feed.load();
		setHistoryVersion((v) => v + 1);
	}

	return { state, history, past, future, trend, busy, refresh };
}

type LocationData = ReturnType<typeof useLocationData>;

/**
 * Ordered by the questions a reader brings: how is the air now, when is it best to go out, what should I do,
 * what is causing it, and how has it moved.
 */
export function LocationDetail({ feed, configured, back, region, related }: Props) {
	const t = useDictionary();
	const data = useLocationData(feed, configured);
	const { state } = data;
	const current = state.current.status === 'success' ? state.current.data : null;

	return (
		<div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 md:pt-8">
			<Button asChild variant="ghost" size="lg" className="-ml-2.5 h-10 text-muted-foreground">
				<Link href={back.href}>
					<ArrowLeft data-icon="inline-start" />
					{back.label}
				</Link>
			</Button>

			<SummaryCard feed={feed} region={region} current={current} busy={data.busy} configured={configured} onRefresh={data.refresh} />

			<div className="mt-5" aria-busy={data.busy}>
				<DetailBody feed={feed} configured={configured} current={current} data={data} />
				{!current && state.current.status === 'loading' && <p className="sr-only">{fill(t.common.loadingPlace, { name: feed.location.name })}</p>}
			</div>

			{related && related.length > 1 && <RelatedList places={related} region={region} />}

			{current && (
				<div className="mt-8">
					<Attribution />
				</div>
			)}
		</div>
	);
}

/**
 * The answer first: the dial beside the place and its verdict, so the row is full at every
 * phone width. Below 360px the name gets the full width above, so a long word never clips.
 */
function SummaryCard({
	feed,
	region,
	current,
	busy,
	configured,
	onRefresh
}: {
	feed: LocationFeed;
	region?: string;
	current: AirQualityData | null;
	busy: boolean;
	configured: boolean;
	onRefresh: () => void;
}) {
	const t = useDictionary();
	const { location } = feed;

	return (
		<Card className="mt-2 gap-0 rounded-[20px] py-0">
			<header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-5 [grid-template-areas:'title_title'_'gauge_verdict'_'note_note'] min-[360px]:[grid-template-areas:'gauge_title'_'gauge_verdict'_'note_note'] sm:gap-x-6 sm:p-6 sm:[grid-template-areas:'gauge_title'_'gauge_verdict'_'gauge_note']">
				<div className="[grid-area:gauge]">
					{current ? (
						<AqiGauge size="md" aqi={current.index.aqi} display={current.index.aqiDisplay} />
					) : (
						<Skeleton className="size-24 shrink-0 rounded-full min-[400px]:size-28 sm:size-36" />
					)}
				</div>
				<div className="min-w-0 [grid-area:title] min-[360px]:self-end">
					<h1 className="font-display text-[1.75rem] leading-[1.05] tracking-[-0.02em] text-balance [overflow-wrap:anywhere] min-[400px]:text-[2rem] sm:text-5xl">
						{location.name}
					</h1>
					<p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
						<MapPin className="size-4 shrink-0" aria-hidden="true" />
						{region ?? location.note}
					</p>
				</div>
				<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 [grid-area:verdict] min-[360px]:self-start">
					{current && (
						<>
							{/* Wraps instead of truncating when the column is narrow; rounded-2xl is still a pill on one line. */}
							<AqiBadge
								aqi={current.index.aqi}
								category={current.index.category}
								color={current.index.color}
								className="rounded-2xl px-3 py-1.5 text-sm max-[399px]:px-2.5 max-[399px]:text-[13px] [&>span:last-child]:whitespace-normal"
							/>
							{current.index.dominantPollutant && (
								<p className="text-sm text-muted-foreground">
									{t.common.dominantPollutant}{' '}
									<strong className="font-semibold text-foreground">{pollutantLabel(current.index.dominantPollutant)}</strong>
								</p>
							)}
						</>
					)}
				</div>
				{/* UAQI runs the opposite way from ISPU, so the direction is stated next to the dial. */}
				<p className="text-xs leading-relaxed text-muted-foreground [grid-area:note] sm:self-start">
					{t.common.scale}{' '}
					<Link href="/about" className="font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline">
						{t.common.howToRead}
					</Link>
				</p>
			</header>
			{/* Freshness and the way to renew it share one row, so neither floats on its own. */}
			<div className="flex items-center justify-between gap-3 border-t px-5 py-3 sm:px-6">
				<div className="grid min-w-0 gap-0.5">
					<span className="text-xs text-muted-foreground">{t.location.lastData}</span>
					{current ? (
						<time dateTime={current.dataTime} className="text-sm font-medium tabular-nums">
							{formatDataTime(current.dataTime, location.timeZone, feed.language)}
						</time>
					) : (
						<Skeleton className="h-5 w-32" />
					)}
				</div>
				<Button variant="outline" size="lg" className="h-10 shrink-0 rounded-full bg-card px-4" onClick={onRefresh} disabled={busy || !configured}>
					<RotateCw data-icon="inline-start" className={cn(busy && 'animate-spin')} />
					{busy ? t.common.refreshing : t.common.refresh}
				</Button>
			</div>
		</Card>
	);
}

function DetailBody({ feed, configured, current, data }: { feed: LocationFeed; configured: boolean; current: AirQualityData | null; data: LocationData }) {
	const t = useDictionary();
	const { state } = data;
	const { location } = feed;

	if (!configured) {
		return <StateMessage tone="error" title={t.errors.not_configured.title} description={t.errors.not_configured.description} />;
	}
	if (state.current.status === 'error') {
		return (
			<StateMessage tone="error" title={t.errors[state.current.code].title} description={t.errors[state.current.code].description}>
				<Button size="lg" onClick={data.refresh}>
					<RotateCw data-icon="inline-start" />
					{t.common.retry}
				</Button>
			</StateMessage>
		);
	}
	if (!current) {
		return (
			<div className="grid gap-5" aria-hidden="true">
				<Skeleton className="h-40 rounded-[20px]" />
				<Skeleton className="h-80 rounded-[20px]" />
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
			<HourPlanner
				hours={data.future}
				loading={state.forecast.status === 'loading' || state.forecast.status === 'idle'}
				timeZone={location.timeZone}
			/>

			<Card className="gap-0 rounded-[20px] py-0 lg:col-span-7">
				<Recommendation
					aqi={current.index.aqi}
					recommendations={current.recommendations ?? {}}
					className="content-start rounded-none border-0 p-5 sm:p-6"
				/>
			</Card>

			<Card className="@container rounded-[20px] lg:col-span-5">
				<CardHeader>
					<CardTitle className="text-lg font-semibold">{t.pollutants.levels}</CardTitle>
					<CardDescription>{t.pollutants.levelsLatest}</CardDescription>
				</CardHeader>
				<CardContent>
					<PollutantBreakdown pollutants={current.pollutants} dominant={current.index.dominantPollutant} />
				</CardContent>
			</Card>

			<TrendCard location={location} data={data} />
		</div>
	);
}

function TrendCard({ location, data }: { location: LocationFeed['location']; data: LocationData }) {
	const t = useDictionary();
	const { history, state, trend } = data;
	const loading = history.status === 'loading' || state.forecast.status === 'loading';

	return (
		<Card className="rounded-[20px] lg:col-span-12">
			<CardHeader className="flex flex-wrap items-baseline justify-between gap-2">
				<div>
					<CardTitle className="text-lg font-semibold">{t.location.trendTitle}</CardTitle>
					<CardDescription>{fill(t.location.trendDescription, { zone: timeZoneLabel(location.timeZone) })}</CardDescription>
				</div>
				<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<span className="w-4 border-t-2 border-primary" aria-hidden="true" />
					{t.location.recorded}
					<span className="ml-2 w-4 border-t-2 border-dashed border-primary/70" aria-hidden="true" />
					{t.common.forecast}
				</p>
			</CardHeader>
			<CardContent className="grid gap-4">
				<TrendStats past={data.past} historyLoading={history.status === 'loading'} timeZone={location.timeZone} />
				{trend.length > 0 ? (
					<TrendChart tall points={trend} timeZone={location.timeZone} label={fill(t.location.trendLabel, { name: location.name })} />
				) : loading ? (
					<Skeleton className="h-72 rounded-xl sm:h-80" />
				) : (
					<p className="py-10 text-center text-sm text-muted-foreground">{t.location.trendMissing}</p>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * The next 24 hours as one band colored by category: the shape of the day reads at a glance, and only one hour
 * carries a number. The pin marks the best hour; hovering, dragging, tapping, or the arrow keys move it to any hour.
 */
/** One hour of the 24-hour strip: Google's band color, edged top and bottom so light bands stay visible. */
function HourSegment({ aqi }: { aqi: number }) {
	const band = aqiBand(aqi);
	return <span className="flex-1" style={{ background: band.fill, boxShadow: bandEdge(band, 'y') }} />;
}

function HourPlanner({ hours, loading, timeZone }: { hours: AirQualityData[]; loading: boolean; timeZone: string }) {
	const next = hours.slice(0, 24);
	const [active, setActive] = useState<number | null>(null);
	const locale = useLocale();
	const t = useDictionary();
	const weekday = dateTimeFormat(locale, { weekday: 'short', timeZone });
	const count = next.length;
	const best = next.reduce((top, h, i) => (h.index.aqi > next[top].index.aqi ? i : top), 0);
	const shown = active ?? best;
	const hourOf = (h: AirQualityData) => formatHour(h.dataTime, timeZone, locale);
	const describe = (i: number) => {
		const h = next[i];
		return `${weekday.format(new Date(h.dataTime))} ${hourOf(h)}, AQI ${h.index.aqi}, ${t.aqi.bands[aqiBand(h.index.aqi).key]}`;
	};
	const bands = [...new Set(next.map((h) => aqiBand(h.index.aqi)))].toSorted((a, b) => a.min - b.min);

	function pick(event: React.PointerEvent<HTMLDivElement>) {
		const rect = event.currentTarget.getBoundingClientRect();
		setActive(Math.min(count - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * count))));
	}

	function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		const from = active ?? best;
		const to = { ArrowLeft: from - 1, ArrowRight: from + 1, Home: 0, End: count - 1 }[event.key];
		if (to !== undefined) {
			event.preventDefault();
			setActive(Math.min(count - 1, Math.max(0, to)));
		} else if (event.key === 'Escape') setActive(null);
	}

	// The pin label leans inward near the ends so it never leaves the card.
	const center = ((shown + 0.5) / count) * 100;
	const align = shown < 3 ? 'translate-x-[-12px]' : shown > count - 4 ? 'translate-x-[calc(-100%+12px)]' : '-translate-x-1/2';

	return (
		<Card className="rounded-[20px] lg:col-span-12">
			<CardHeader className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<CardTitle id="planner-title" className="text-lg font-semibold">
					{t.location.next24}
				</CardTitle>
				{count > 0 && (
					<ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label={t.aqi.categories}>
						{bands.map((band) => (
							<li key={band.min} className="flex items-center gap-1.5">
								<span className="size-2.5 rounded-[3px]" style={{ background: band.fill, boxShadow: bandEdge(band) }} aria-hidden="true" />
								{t.aqi.bands[band.key]}
							</li>
						))}
					</ul>
				)}
			</CardHeader>
			<CardContent>
				{count > 0 ? (
					<>
						<div className="relative h-10" aria-hidden="true">
							<div className={cn('absolute bottom-2.5 whitespace-nowrap', align)} style={{ left: `${center}%` }}>
								<span className="inline-block rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background tabular-nums">
									{active === null ? fill(t.location.bestPin, { hour: hourOf(next[best]), aqi: String(next[best].index.aqi) }) : describe(active)}
								</span>
							</div>
							<span className="absolute bottom-0 h-2.5 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: `${center}%` }} />
						</div>
						<div
							role="slider"
							tabIndex={0}
							aria-labelledby="planner-title"
							aria-valuemin={0}
							aria-valuemax={count - 1}
							aria-valuenow={shown}
							aria-valuetext={active === null ? fill(t.location.bestSpoken, { detail: describe(best) }) : describe(active)}
							onPointerDown={pick}
							onPointerMove={(event) => (event.pointerType === 'mouse' || event.buttons > 0) && pick(event)}
							onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
							onKeyDown={onKeyDown}
							onBlur={() => setActive(null)}
							className="relative flex h-4 cursor-pointer touch-pan-y overflow-hidden rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							{next.map((h) => (
								<HourSegment key={h.dataTime} aqi={h.index.aqi} />
							))}
							<span
								aria-hidden="true"
								className="absolute inset-y-0 border-2 border-background"
								style={{ left: `${(shown / count) * 100}%`, width: `${100 / count}%` }}
							/>
						</div>
						{/* Ticks on clock hours divisible by 3 (6 on phones); midnight and the first tick also name the day. */}
						<div className="relative mt-1.5 h-8 text-[11px] text-muted-foreground tabular-nums" aria-hidden="true">
							{next.map((h, i) => {
								const hour = Number.parseInt(hourOf(h), 10);
								if (hour % 3 !== 0) return null;
								const first = next.findIndex((x) => Number.parseInt(hourOf(x), 10) % 3 === 0) === i;
								return (
									<span
										key={h.dataTime}
										className={cn('absolute grid -translate-x-1/2 justify-items-center leading-tight', hour % 6 !== 0 && 'max-sm:hidden')}
										style={{ left: `${((i + 0.5) / count) * 100}%` }}
									>
										{hourOf(h)}
										{(first || hour === 0) && <span className="font-semibold">{weekday.format(new Date(h.dataTime))}</span>}
									</span>
								);
							})}
						</div>
						<p className="text-xs text-muted-foreground">{t.location.plannerHint}</p>
					</>
				) : loading ? (
					<Skeleton className="h-20 rounded-xl" />
				) : (
					<p className="text-sm text-muted-foreground">{t.location.plannerMissing}</p>
				)}
			</CardContent>
		</Card>
	);
}

/** The chart's past day in numbers, above the chart they describe. The best hour ahead lives in the planner. */
function TrendStats({ past, historyLoading, timeZone }: { past: AirQualityData[]; historyLoading: boolean; timeZone: string }) {
	const locale = useLocale();
	const t = useDictionary();
	const values = past.map((h) => h.index.aqi);
	const when = (iso: string) => `${formatDay(iso, timeZone, locale)}, ${formatHour(iso, timeZone, locale)}`;

	const stats = [
		{
			label: t.location.low24,
			value: values.length ? Math.min(...values) : null,
			note: values.length ? when(past[values.indexOf(Math.min(...values))].dataTime) : null
		},
		{
			label: t.location.high24,
			value: values.length ? Math.max(...values) : null,
			note: values.length ? when(past[values.indexOf(Math.max(...values))].dataTime) : null
		},
		{
			label: t.location.average24,
			value: values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null,
			note: values.length ? plural(t.location.fromHours, values.length, locale) : null
		}
	];

	return (
		// Hairlines come from 1px gaps over a border-colored backdrop, so they hold at any column count.
		<dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
			{stats.map(({ label, value, note }) => (
				<div key={label} className="grid content-start gap-0.5 bg-card px-3 py-3 sm:px-4">
					<dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
					<dd className="grid gap-0.5">
						{value !== null ? (
							<>
								<span className="text-xl font-semibold tabular-nums" style={{ color: aqiBand(value).ink }}>
									{value}
								</span>
								{note && <span className="text-xs text-muted-foreground">{note}</span>}
							</>
						) : historyLoading ? (
							<Skeleton className="h-10 rounded-md" />
						) : (
							<span className="text-sm text-muted-foreground">{t.common.notAvailable}</span>
						)}
					</dd>
				</div>
			))}
		</dl>
	);
}

/**
 * Neighbours ranked from best air to worst, so the page answers "is it better nearby?". Readings come from
 * data the session already holds (from Pantauan); places without one sit at the end, unranked.
 */
function RelatedList({ places, region }: { places: RelatedPlace[]; region?: string }) {
	const t = useDictionary();
	const feeds = useMemo(() => places.map((place) => place.feed), [places]);
	const states = useFeeds(feeds);
	const rows = places
		.map((place, i) => {
			const current = states[i].current;
			return { place, aqi: current.status === 'success' ? current.data.index.aqi : null, order: i };
		})
		.toSorted((a, b) => (a.aqi === null ? 1 : 0) - (b.aqi === null ? 1 : 0) || (b.aqi ?? 0) - (a.aqi ?? 0) || a.order - b.order);
	const missing = rows.some((row) => row.aqi === null);

	return (
		<nav aria-labelledby="related-title" className="mt-10">
			<div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h2 id="related-title" className="font-display text-3xl leading-tight tracking-[-0.01em]">
					{fill(t.location.relatedTitle, { region: region ?? t.location.thisArea })}
				</h2>
				<p className="text-sm text-muted-foreground">{t.location.relatedOrder}</p>
			</div>
			<ol className="overflow-hidden rounded-[20px] border bg-card">
				{rows.map(({ place, aqi }) => {
					const band = aqi === null ? null : aqiBand(aqi);
					const body = (
						<>
							<span className="min-w-0 truncate font-semibold">
								{place.name}
								{place.current && <span className="ml-2 text-xs font-normal text-muted-foreground">{t.location.thisPage}</span>}
							</span>
							<span aria-hidden="true" className="relative h-1.5 rounded-full bg-muted max-sm:hidden">
								{band && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(aqi!, 2)}%`, background: band.fill }} />}
							</span>
							{band ? (
								<span className="text-right text-sm whitespace-nowrap tabular-nums">
									<strong className="font-semibold" style={{ color: band.ink }}>
										{aqi}
									</strong>{' '}
									<span className="text-xs text-muted-foreground">{t.aqi.bands[band.key]}</span>
								</span>
							) : (
								<span className="text-right text-xs text-muted-foreground">{t.location.notLoaded}</span>
							)}
							{place.current ? <span /> : <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
						</>
					);
					const grid =
						'grid min-h-12 grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-4 px-4 py-2.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_7rem_1rem] sm:px-5';
					return (
						<li key={place.href} className="border-t first:border-t-0">
							{place.current ? (
								<div aria-current="page" className={cn(grid, 'bg-accent')}>
									{body}
								</div>
							) : (
								<Link
									href={place.href}
									className={cn(grid, 'outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset')}
								>
									{body}
								</Link>
							)}
						</li>
					);
				})}
			</ol>
			{missing && <p className="mt-2 text-xs text-muted-foreground">{t.location.relatedNote}</p>}
		</nav>
	);
}
