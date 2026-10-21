'use client';

import { Suspense, use, useEffect } from 'react';
import { Clock, MapPin, RotateCw } from 'lucide-react';
import { fromApi, toRemote, type Remote } from '@/lib/client/api';
import { useKlhkStation } from '@/lib/client/klhk-feed';
import { isBusy, useFeed, type LocationFeed } from '@/lib/client/location-feed';
import { aqiBand } from '@/lib/aqi';
import { formatHour, timeZoneLabel } from '@/lib/format';
import { fill } from '@/lib/i18n/config';
import type { AirQualityData, ApiResponse, PollutantCode, StreamedCity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AqiBadge } from './aqi-badge';
import { AqiGauge } from './aqi-gauge';
import { IspuChip } from './ispu-chip';
import { PollutantTiles } from './pollutant-tiles';
import { TrendChart } from './trend-chart';
import { Link } from './link';
import { useDictionary, useLocale } from './locale-provider';

const SUMMARY_POLLUTANTS: PollutantCode[] = ['pm25', 'pm10', 'no2', 'o3'];

/** Small section labels share one style, so the pollutant names and the forecast label read as one set. */
const LABEL = 'meta-copy font-semibold text-muted-foreground';

function Place({ note }: { note: string }) {
	return (
		<CardDescription className="flex items-center gap-1">
			<MapPin className="size-3.5 shrink-0" aria-hidden="true" />
			<span className="truncate">{note}</span>
		</CardDescription>
	);
}

/** Shown while a card's current conditions load, and as the fallback while the page streams them. */
export function CityCardSkeleton({ feed }: { feed: LocationFeed }) {
	const t = useDictionary();
	const { location } = feed;
	const titleId = `city-${location.key}`;
	return (
		<Card className="h-full rounded-2xl" aria-labelledby={titleId} aria-busy="true">
			<CardHeader className="gap-1.5">
				<Skeleton className="h-6 w-36 rounded-full" />
				<CardTitle id={titleId} className="text-lg font-semibold">
					{location.name}
				</CardTitle>
				<Place note={location.note} />
				<CardAction>
					<Skeleton className="size-[72px] rounded-full" />
				</CardAction>
			</CardHeader>
			<CardContent className="grid gap-4">
				<Skeleton className="h-[74px] rounded-xl" />
				<Skeleton className="h-28 rounded-xl" />
			</CardContent>
			<p className="sr-only">{fill(t.common.loadingPlace, { name: location.name })}</p>
		</Card>
	);
}

/**
 * Until this device has its own data, a card shows what the server streamed with the page: `use()`
 * suspends until that part arrives (already resolved when the server cache was warm), and the feed
 * takes it over so detail pages and refreshes start from it.
 */
function useStreamed<T>(
	feed: LocationFeed,
	part: 'current' | 'forecast',
	live: Remote<T>,
	streamed: Promise<ApiResponse<T>> | undefined
): Remote<T> {
	const response = streamed && live.status === 'idle' ? use(streamed) : null;
	useEffect(() => {
		if (!response) return;
		if (part === 'current') feed.seed({ part, result: fromApi(response as ApiResponse<AirQualityData>) });
		else feed.seed({ part, result: fromApi(response as ApiResponse<AirQualityData[]>) });
	}, [feed, part, response]);
	return response ? toRemote(fromApi(response)) : live;
}

export function CityCard({ feed, href, streamed }: { feed: LocationFeed; href: string; streamed?: StreamedCity }) {
	const locale = useLocale();
	const t = useDictionary();
	const state = useFeed(feed);
	const current = useStreamed(feed, 'current', state.current, streamed?.current);
	const station = useKlhkStation(feed.location);
	const { location } = feed;
	const titleId = `city-${location.key}`;

	if (current.status === 'error') {
		const message = t.errors[current.code];
		return (
			<Card className="h-full rounded-2xl" aria-labelledby={titleId}>
				<CardHeader>
					<CardTitle id={titleId} className="text-lg font-semibold">
						{location.name}
					</CardTitle>
					<Place note={location.note} />
				</CardHeader>
				<CardContent>
					<div role="alert" className="grid justify-items-start gap-1 rounded-xl bg-destructive/5 p-4">
						<p className="font-semibold text-destructive">{message.title}</p>
						<p className="body-copy text-muted-foreground">{message.description}</p>
						<Button variant="outline" size="lg" className="mt-2" onClick={() => feed.load()}>
							<RotateCw data-icon="inline-start" />
							{t.common.retry}
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (current.status !== 'success') return <CityCardSkeleton feed={feed} />;

	const data = current.data;
	const { index, pollutants, dataTime } = data;
	const busy = isBusy(state);

	return (
		<Card
			className="relative h-full rounded-2xl transition-shadow has-[a.stretched:hover]:shadow-lg has-[a.stretched:hover]:ring-primary/30"
			aria-labelledby={titleId}
			aria-busy={busy}
		>
			{/* Color stays on the badge only, so a grid of cards does not turn into a wall of color. */}
			<CardHeader className="gap-1.5">
				{/* Stacked, so every card's header keeps one shape whatever the category lengths. */}
				<div className="mb-0.5 flex flex-col items-start gap-1.5">
					<AqiBadge aqi={index.aqi} category={index.category} color={index.color} />
					<IspuChip station={station} google={data.ispu} timeZone={location.timeZone} />
				</div>
				<CardTitle id={titleId} className="text-lg font-semibold">
					{/* Stretched over the whole card so the card is one large tap target. */}
					<Link
						href={href}
						className="stretched outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
					>
						{location.name}
					</Link>
				</CardTitle>
				<Place note={location.note} />
				<CardAction className="row-span-3">
					<AqiGauge aqi={index.aqi} display={index.aqiDisplay} />
				</CardAction>
			</CardHeader>

			<CardContent className="grid gap-4">
				<PollutantTiles pollutants={pollutants} codes={SUMMARY_POLLUTANTS} />
				<div className="grid gap-1">
					<p className={LABEL}>{t.card.forecast24}</p>
					{/* The forecast is slower than current conditions, so it fills in on its own. */}
					<Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
						<CardForecast feed={feed} live={state.forecast} streamed={streamed?.forecast} current={data} />
					</Suspense>
				</div>
			</CardContent>

			<CardFooter className="meta-copy mt-auto flex-wrap gap-1.5 border-t-0 bg-transparent pt-0 text-muted-foreground">
				<Clock className="size-3.5" aria-hidden="true" />
				{fill(t.card.dataAt, { time: `${formatHour(dataTime, location.timeZone, locale)} ${timeZoneLabel(location.timeZone, new Date(dataTime))}` })}
				{busy && <span className="ml-auto">{t.common.refreshing}</span>}
			</CardFooter>
		</Card>
	);
}

function CardForecast({
	feed,
	live,
	streamed,
	current
}: {
	feed: LocationFeed;
	live: Remote<AirQualityData[]>;
	streamed: Promise<ApiResponse<AirQualityData[]>> | undefined;
	current: AirQualityData;
}) {
	const t = useDictionary();
	const forecast = useStreamed(feed, 'forecast', live, streamed);
	const { location } = feed;

	if (forecast.status === 'error') {
		return <p className="flex h-24 items-center text-sm text-muted-foreground">{t.card.forecastMissing}</p>;
	}
	if (forecast.status !== 'success') return <Skeleton className="h-24 rounded-xl" />;

	return (
		<TrendChart
			variant="compact"
			color={aqiBand(current.index.aqi).ink}
			timeZone={location.timeZone}
			label={fill(t.card.forecastLabel, { name: location.name })}
			points={[
				{ dateTime: current.dataTime, aqi: current.index.aqi },
				// A cached forecast can start at the hour current conditions already cover.
				...forecast.data
					.filter((h) => h.dataTime > current.dataTime)
					.map((h) => ({ dateTime: h.dataTime, aqi: h.index.aqi, forecast: true }))
			]}
		/>
	);
}
