'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Clock, MapPin, RotateCw } from 'lucide-react';
import { postJson, toRemote, type Remote } from '@/lib/client/api';
import { isBusy, needsLoad, useFeed, useFeeds, type LocationFeed } from '@/lib/client/location-feed';
import { aqiBand } from '@/lib/aqi';
import { ERROR_MESSAGES, formatDataTime, formatDay, formatHour, pollutantLabel, timeZoneLabel } from '@/lib/format';
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
	/** Small label above the name, e.g. the region. */
	eyebrow?: string;
	related?: RelatedPlace[];
}

/**
 * Ordered by the questions a reader brings: how is the air now, when is it best to go out, what should I do,
 * what is causing it, and how has it moved.
 */
export function LocationDetail({ feed, configured, back, eyebrow, related }: Props) {
	const state = useFeed(feed);
	const { location } = feed;
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
		postJson<AirQualityData[]>('/api/air-quality/history', { ...feed.location.coordinates, hours: 24 }, controller.signal).then((result) => {
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

	const current = state.current.status === 'success' ? state.current.data : null;

	return (
		<div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 md:pt-8">
			<Button asChild variant="ghost" size="lg" className="-ml-2.5 h-10 text-muted-foreground">
				<Link href={back.href}>
					<ArrowLeft data-icon="inline-start" />
					{back.label}
				</Link>
			</Button>

			{/* The answer first: the dial beside the place it describes. */}
			<Card className="mt-2 gap-0 rounded-[20px] py-0">
				<header className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5 sm:p-6">
					{current ? (
						<AqiGauge size="md" aqi={current.index.aqi} display={current.index.aqiDisplay} />
					) : (
						<Skeleton className="size-32 shrink-0 rounded-full sm:size-36" />
					)}
					<div className="min-w-0 flex-1 basis-56">
						{eyebrow && <p className="text-sm font-semibold text-primary">{eyebrow}</p>}
						<h1 className="font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">{location.name}</h1>
						<p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
							<MapPin className="size-4 shrink-0" aria-hidden="true" />
							{location.note}
						</p>
						{current && (
							<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
								<AqiBadge aqi={current.index.aqi} category={current.index.category} color={current.index.color} className="px-3 py-1.5 text-sm" />
								{current.index.dominantPollutant && (
									<p className="text-sm text-muted-foreground">
										Polutan dominan{' '}
										<strong className="font-semibold text-foreground">{pollutantLabel(current.index.dominantPollutant)}</strong>
									</p>
								)}
							</div>
						)}
						{/* UAQI runs the opposite way from ISPU, so the direction is stated next to the dial. */}
						<p className="mt-2 text-xs text-muted-foreground">
							Skala 0–100, makin tinggi makin baik.{' '}
							<Link href="/about" className="font-medium text-primary underline-offset-4 hover:underline">
								Cara membaca AQI
							</Link>
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-col sm:items-end">
						{current && (
							<p className="flex items-center gap-1.5 text-sm text-muted-foreground">
								<Clock className="size-4" aria-hidden="true" />
								Data <time dateTime={current.dataTime}>{formatDataTime(current.dataTime, location.timeZone)}</time>
							</p>
						)}
						<Button variant="outline" size="lg" className="h-10 rounded-full bg-card px-4" onClick={refresh} disabled={busy || !configured}>
							<RotateCw data-icon="inline-start" className={cn(busy && 'animate-spin')} />
							{busy ? 'Memperbarui…' : 'Perbarui'}
						</Button>
					</div>
				</header>
			</Card>

			<div className="mt-5" aria-busy={busy}>
				{!configured ? (
					<StateMessage tone="error" title={ERROR_MESSAGES.not_configured.title} description={ERROR_MESSAGES.not_configured.description} />
				) : state.current.status === 'error' ? (
					<StateMessage tone="error" title={ERROR_MESSAGES[state.current.code].title} description={ERROR_MESSAGES[state.current.code].description}>
						<Button size="lg" onClick={refresh}>
							<RotateCw data-icon="inline-start" />
							Coba lagi
						</Button>
					</StateMessage>
				) : current ? (
					<div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
						<HourPlanner
							hours={future}
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
								<CardTitle className="text-lg font-semibold">Kadar polutan</CardTitle>
								<CardDescription>Pada jam data terakhir, dibanding pedoman WHO</CardDescription>
							</CardHeader>
							<CardContent>
								<PollutantBreakdown pollutants={current.pollutants} dominant={current.index.dominantPollutant} />
							</CardContent>
						</Card>

						<Card className="rounded-[20px] lg:col-span-12">
							<CardHeader className="flex flex-wrap items-baseline justify-between gap-2">
								<div>
									<CardTitle className="text-lg font-semibold">Tren 48 jam</CardTitle>
									<CardDescription>24 jam terakhir dan prakiraan 24 jam ke depan, waktu {timeZoneLabel(location.timeZone)}</CardDescription>
								</div>
								<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
									<span className="w-4 border-t-2 border-primary" aria-hidden="true" />
									Tercatat
									<span className="ml-2 w-4 border-t-2 border-dashed border-primary/70" aria-hidden="true" />
									Prakiraan
								</p>
							</CardHeader>
							<CardContent className="grid gap-4">
								<TrendStats past={past} historyLoading={history.status === 'loading'} timeZone={location.timeZone} />
								{trend.length > 0 ? (
									<TrendChart tall points={trend} timeZone={location.timeZone} label={`Tren AQI ${location.name}, 24 jam terakhir dan prakiraan 24 jam`} />
								) : history.status === 'loading' || state.forecast.status === 'loading' ? (
									<Skeleton className="h-72 rounded-xl sm:h-80" />
								) : (
									<p className="py-10 text-center text-sm text-muted-foreground">Tren belum tersedia untuk lokasi ini.</p>
								)}
							</CardContent>
						</Card>
					</div>
				) : (
					<div className="grid gap-5" aria-hidden="true">
						<Skeleton className="h-40 rounded-[20px]" />
						<Skeleton className="h-80 rounded-[20px]" />
					</div>
				)}
				{!current && state.current.status === 'loading' && <p className="sr-only">Memuat data {location.name}</p>}
			</div>

			{related && related.length > 1 && <RelatedList places={related} region={eyebrow} />}

			{current && (
				<div className="mt-8">
					<Attribution />
				</div>
			)}
		</div>
	);
}

/**
 * The next 24 hours as one band colored by category: the shape of the day reads at a glance, and only one hour
 * carries a number. The pin marks the best hour; hovering, dragging, tapping, or the arrow keys move it to any hour.
 */
function HourPlanner({ hours, loading, timeZone }: { hours: AirQualityData[]; loading: boolean; timeZone: string }) {
	const next = hours.slice(0, 24);
	const [active, setActive] = useState<number | null>(null);
	const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone });
	const count = next.length;
	const best = next.reduce((top, h, i) => (h.index.aqi > next[top].index.aqi ? i : top), 0);
	const shown = active ?? best;
	const hourOf = (h: AirQualityData) => formatHour(h.dataTime, timeZone);
	const describe = (i: number) => {
		const h = next[i];
		return `${weekday.format(new Date(h.dataTime))} ${hourOf(h)}, AQI ${h.index.aqi}, ${aqiBand(h.index.aqi).label}`;
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
					24 jam ke depan
				</CardTitle>
				{count > 0 && (
					<ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Kategori">
						{bands.map((band) => (
							<li key={band.min} className="flex items-center gap-1.5">
								<span className="size-2.5 rounded-[3px]" style={{ background: band.fill }} aria-hidden="true" />
								{band.label}
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
									{active === null ? `Terbaik ${hourOf(next[best])}, AQI ${next[best].index.aqi}` : describe(active)}
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
							aria-valuetext={active === null ? `Terbaik ${describe(best)}` : describe(active)}
							onPointerDown={pick}
							onPointerMove={(event) => (event.pointerType === 'mouse' || event.buttons > 0) && pick(event)}
							onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
							onKeyDown={onKeyDown}
							onBlur={() => setActive(null)}
							className="relative flex h-4 cursor-pointer touch-pan-y overflow-hidden rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							{next.map((h) => (
								<span key={h.dataTime} className="flex-1" style={{ background: aqiBand(h.index.aqi).fill }} />
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
						<p className="text-xs text-muted-foreground">Arahkan, ketuk, atau geser pita untuk melihat AQI tiap jam.</p>
					</>
				) : loading ? (
					<Skeleton className="h-20 rounded-xl" />
				) : (
					<p className="text-sm text-muted-foreground">Prakiraan per jam belum tersedia untuk lokasi ini.</p>
				)}
			</CardContent>
		</Card>
	);
}

/** The chart's past day in numbers, above the chart they describe. The best hour ahead lives in the planner. */
function TrendStats({ past, historyLoading, timeZone }: { past: AirQualityData[]; historyLoading: boolean; timeZone: string }) {
	const values = past.map((h) => h.index.aqi);
	const when = (iso: string) => `${formatDay(iso, timeZone)}, ${formatHour(iso, timeZone)}`;

	const stats = [
		{
			label: 'Terendah 24 jam',
			value: values.length ? Math.min(...values) : null,
			note: values.length ? when(past[values.indexOf(Math.min(...values))].dataTime) : null
		},
		{
			label: 'Tertinggi 24 jam',
			value: values.length ? Math.max(...values) : null,
			note: values.length ? when(past[values.indexOf(Math.max(...values))].dataTime) : null
		},
		{
			label: 'Rata-rata 24 jam',
			value: values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null,
			note: values.length ? `dari ${values.length} jam data` : null
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
							<span className="text-sm text-muted-foreground">Belum tersedia</span>
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
					Lokasi lain di {region ?? 'wilayah ini'}
				</h2>
				<p className="text-sm text-muted-foreground">Urut dari udara terbaik</p>
			</div>
			<ol className="overflow-hidden rounded-[20px] border bg-card">
				{rows.map(({ place, aqi }) => {
					const band = aqi === null ? null : aqiBand(aqi);
					const body = (
						<>
							<span className="min-w-0 truncate font-semibold">
								{place.name}
								{place.current && <span className="ml-2 text-xs font-normal text-muted-foreground">halaman ini</span>}
							</span>
							<span aria-hidden="true" className="relative h-1.5 rounded-full bg-muted max-sm:hidden">
								{band && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(aqi!, 2)}%`, background: band.fill }} />}
							</span>
							{band ? (
								<span className="text-right text-sm whitespace-nowrap tabular-nums">
									<strong className="font-semibold" style={{ color: band.ink }}>
										{aqi}
									</strong>{' '}
									<span className="text-xs text-muted-foreground">{band.label}</span>
								</span>
							) : (
								<span className="text-right text-xs text-muted-foreground">Belum dimuat</span>
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
			{missing && <p className="mt-2 text-xs text-muted-foreground">Angka tampil untuk lokasi yang sudah dimuat di Pantauan, tanpa permintaan data baru.</p>}
		</nav>
	);
}
