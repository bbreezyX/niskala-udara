'use client';

import Link from 'next/link';
import { Clock, MapPin, RotateCw } from 'lucide-react';
import { isBusy, useFeed, type LocationFeed } from '@/lib/client/location-feed';
import { aqiBand } from '@/lib/aqi';
import { ERROR_MESSAGES, formatHour, timeZoneLabel } from '@/lib/format';
import type { PollutantCode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AqiBadge } from './aqi-badge';
import { AqiGauge } from './aqi-gauge';
import { PollutantTiles } from './pollutant-tiles';
import { TrendChart } from './trend-chart';

const SUMMARY_POLLUTANTS: PollutantCode[] = ['pm25', 'pm10', 'no2', 'o3'];

/** Small section labels share one style, so the pollutant names and "Prakiraan" read as one set. */
const LABEL = 'text-xs font-semibold text-muted-foreground';

export function CityCard({ feed, href }: { feed: LocationFeed; href: string }) {
	const state = useFeed(feed);
	const { location } = feed;
	const titleId = `city-${location.key}`;

	const place = (
		<CardDescription className="flex items-center gap-1">
			<MapPin className="size-3.5 shrink-0" aria-hidden="true" />
			<span className="truncate">{location.note}</span>
		</CardDescription>
	);

	if (state.current.status === 'error') {
		const message = ERROR_MESSAGES[state.current.code];
		return (
			<Card className="h-full rounded-2xl" aria-labelledby={titleId}>
				<CardHeader>
					<CardTitle id={titleId} className="text-lg font-semibold">
						{location.name}
					</CardTitle>
					{place}
				</CardHeader>
				<CardContent>
					<div role="alert" className="grid justify-items-start gap-1 rounded-xl bg-destructive/5 p-4">
						<p className="font-semibold text-destructive">{message.title}</p>
						<p className="text-sm text-muted-foreground">{message.description}</p>
						<Button variant="outline" size="lg" className="mt-2" onClick={() => feed.load()}>
							<RotateCw data-icon="inline-start" />
							Coba lagi
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (state.current.status !== 'success') {
		return (
			<Card className="h-full rounded-2xl" aria-labelledby={titleId} aria-busy="true">
				<CardHeader className="gap-1.5">
					<Skeleton className="h-6 w-36 rounded-full" />
					<CardTitle id={titleId} className="text-lg font-semibold">
						{location.name}
					</CardTitle>
					{place}
					<CardAction>
						<Skeleton className="size-[72px] rounded-full" />
					</CardAction>
				</CardHeader>
				<CardContent className="grid gap-4">
					<Skeleton className="h-[74px] rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</CardContent>
				<p className="sr-only">Memuat data {location.name}</p>
			</Card>
		);
	}

	const { index, pollutants, dataTime } = state.current.data;
	const band = aqiBand(index.aqi);
	const busy = isBusy(state);

	return (
		<Card
			className="relative h-full rounded-2xl transition-shadow has-[a.stretched:hover]:shadow-lg has-[a.stretched:hover]:ring-primary/30"
			aria-labelledby={titleId}
			aria-busy={busy}
		>
			{/* Color stays on the badge only, so a grid of cards does not turn into a wall of color. */}
			<CardHeader className="gap-1.5">
				<AqiBadge aqi={index.aqi} category={index.category} color={index.color} className="mb-0.5 justify-self-start" />
				<CardTitle id={titleId} className="text-lg font-semibold">
					{/* Stretched over the whole card so the card is one large tap target. */}
					<Link
						href={href}
						className="stretched outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
					>
						{location.name}
					</Link>
				</CardTitle>
				{place}
				<CardAction className="row-span-3">
					<AqiGauge aqi={index.aqi} display={index.aqiDisplay} />
				</CardAction>
			</CardHeader>

			<CardContent className="grid gap-4">
				<PollutantTiles pollutants={pollutants} codes={SUMMARY_POLLUTANTS} />
				<div className="grid gap-1">
					<p className={LABEL}>Prakiraan 24 jam</p>
					{state.forecast.status === 'success' ? (
						<TrendChart
							variant="compact"
							color={band.ink}
							timeZone={location.timeZone}
							label={`Prakiraan AQI 24 jam untuk ${location.name}`}
							points={[
								{ dateTime: dataTime, aqi: index.aqi },
								...state.forecast.data.map((h) => ({ dateTime: h.dataTime, aqi: h.index.aqi, forecast: true }))
							]}
						/>
					) : state.forecast.status === 'error' ? (
						<p className="flex h-24 items-center text-sm text-muted-foreground">Prakiraan belum tersedia</p>
					) : (
						<Skeleton className="h-24 rounded-xl" />
					)}
				</div>
			</CardContent>

			<CardFooter className="mt-auto gap-1.5 border-t-0 bg-transparent pt-0 text-xs text-muted-foreground">
				<Clock className="size-3.5" aria-hidden="true" />
				Data {formatHour(dataTime, location.timeZone)} {timeZoneLabel(location.timeZone, new Date(dataTime))}
				{busy && <span className="ml-auto">Memperbarui…</span>}
			</CardFooter>
		</Card>
	);
}
