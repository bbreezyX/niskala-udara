'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Link } from './link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence, m } from 'motion/react';
import { Clock, LocateFixed, RotateCw, SlidersHorizontal } from 'lucide-react';
import { CITIES, DEFAULT_REGION, regionFromParam, type RegionId } from '@/lib/config/cities';
import { fill, plural, type Locale } from '@/lib/i18n/config';
import { cityFeed, isBusy, loadRegion, needsLoad, useFeeds, type FeedState, type LocationFeed } from '@/lib/client/location-feed';
import { rememberedRegion, rememberRegion } from '@/lib/client/region-memory';
import type { RegionStream } from '@/lib/types';
import { formatHour, timeZoneLabel } from '@/lib/format';
import { aqiBandIndex, AQI_BANDS } from '@/lib/aqi';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AqiSpread } from './aqi-spread';
import { CityCard, CityCardSkeleton } from './city-card';
import { DataUnavailable, StateMessage } from './info-blocks';
import { useDictionary, useLocale } from './locale-provider';
import { RegionPicker } from './region-picker';
import { DEFAULT_FILTER, type ListFilter } from './list-filter';
import { SortFilter } from './sort-filter';

const aqiOf = (state: FeedState) => (state.current.status === 'success' ? state.current.data.index.aqi : null);

const cityId = (feed: LocationFeed) => feed.location.key.replace('city:', '');

/** The cards to show, in order. Locations without data yet stay visible: hiding them would look like missing data. */
function applyFilter(feeds: LocationFeed[], states: FeedState[], filter: ListFilter, locale: Locale) {
	const bands = new Set(filter.bands);
	const list = feeds
		.map((feed, i) => ({ feed, state: states[i] }))
		.filter(({ state }) => {
			const aqi = aqiOf(state);
			return aqi === null || bands.has(aqiBandIndex(aqi));
		});
	if (filter.sort === 'name') return list.toSorted((a, b) => a.feed.location.name.localeCompare(b.feed.location.name, locale));
	if (filter.sort === 'best' || filter.sort === 'worst') {
		const direction = filter.sort === 'best' ? -1 : 1;
		return list.toSorted((a, b) => {
			const aqiA = aqiOf(a.state);
			const aqiB = aqiOf(b.state);
			if (aqiA === null || aqiB === null) return aqiA === null ? 1 : -1;
			return (aqiA - aqiB) * direction;
		});
	}
	return list;
}

/** The card grid, with the not-configured and nothing-matches states in its place when there is nothing to show. */
function CityList({
	configured,
	visible,
	hiddenCount,
	streamed,
	onReset
}: {
	configured: boolean;
	visible: { feed: LocationFeed }[];
	hiddenCount: number;
	streamed: RegionStream['cities'] | null;
	onReset: () => void;
}) {
	const t = useDictionary();
	const locale = useLocale();
	return (
		<>
			{!configured && <DataUnavailable title={t.errors.not_configured.title} description={t.errors.not_configured.description} />}
			{configured && visible.length === 0 && (
				<StateMessage variant="compact" icon={SlidersHorizontal} title={t.dashboard.emptyTitle} description={t.dashboard.emptyDescription}>
					<Button variant="link" className="h-10 px-0 text-primary" onClick={onReset}>
						{t.dashboard.resetFilter}
					</Button>
				</StateMessage>
			)}
			{/* Always mounted, so cards filtered away (even the last one) still play their exit. */}
			<ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-5">
				<AnimatePresence mode="popLayout" initial={false}>
					{configured &&
						visible.map(({ feed }) => (
							<m.li
								key={feed.location.key}
								layout
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.97 }}
								transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
							>
								<Suspense fallback={<CityCardSkeleton feed={feed} />}>
									<CityCard feed={feed} href={`/location/${cityId(feed)}`} streamed={streamed?.[cityId(feed)]} />
								</Suspense>
							</m.li>
						))}
				</AnimatePresence>
			</ul>
			{configured && visible.length > 0 && hiddenCount > 0 && (
				<p className="mt-4 text-sm text-muted-foreground">
					{plural(t.dashboard.hidden, hiddenCount, locale)}{' '}
					<Button variant="link" className="h-11 px-1" onClick={onReset}>
						{t.dashboard.showAll}
					</Button>
				</p>
			)}
		</>
	);
}

/** `initial` is what the server streams for the region in the URL it rendered; null without a key. */
export function Dashboard({ configured, initial }: { configured: boolean; initial: RegionStream | null }) {
	const t = useDictionary();
	const locale = useLocale();
	const pathname = usePathname();
	// The region lives in the URL, so "back" from a city page returns to the same region.
	const regionParam = useSearchParams().get('region');
	const region = regionFromParam(regionParam);
	// Only the active region is shown and loaded, so a page view costs one region's requests.
	const feeds = useMemo(() => CITIES.filter((city) => city.region === region).map((city) => cityFeed(city, locale)), [region, locale]);
	const states = useFeeds(feeds);
	const [filter, setFilter] = useState<ListFilter>(DEFAULT_FILTER);
	const streamed = initial?.region === region ? initial.cities : null;

	// The native history API keeps useSearchParams in sync without a server round trip, so switching
	// region is instant; the new region then loads with one streamed request.
	function setRegion(next: RegionId) {
		rememberRegion(next);
		const query = next === DEFAULT_REGION ? '' : `?region=${next}`;
		window.history.replaceState(null, '', `${pathname}${query}`);
	}

	// A bare URL opens the region last picked on this device. A ?region= link is opened as sent and
	// is not remembered: only the visitor's own pick or location is.
	useEffect(() => {
		if (regionParam !== null) return;
		const saved = rememberedRegion();
		if (saved && saved !== DEFAULT_REGION) window.history.replaceState(null, '', `${pathname}?region=${saved}`);
	}, [regionParam, pathname]);

	const visible = useMemo(() => applyFilter(feeds, states, filter, locale), [feeds, states, filter, locale]);

	const anyBusy = states.some(isBusy);
	const hiddenCount = feeds.length - visible.length;
	const bandCounts = AQI_BANDS.map((_, i) => states.filter((state) => {
		const aqi = aqiOf(state);
		return aqi !== null && aqiBandIndex(aqi) === i;
	}).length);
	const pendingCount = states.filter((state) => aqiOf(state) === null).length;
	const loadingCount = states.filter((state) => state.current.status === 'loading').length;
	const loadedCount = states.filter((state) => state.current.status === 'success').length;
	const announcement =
		loadingCount > 0 ? plural(t.dashboard.loading, loadingCount, locale) : loadedCount > 0 ? plural(t.dashboard.loaded, loadedCount, locale) : '';

	// Load cities that have no data yet (or only stale data): one streamed request for the region, or a
	// single lookup when only one city needs it. Cities the page is streaming arrive on their own, and feeds
	// are shared with the detail pages, so returning from one does not ask again. Without a key, the
	// not-configured notice is shown.
	useEffect(() => {
		if (!configured) return;
		const stale = feeds.filter((feed) => needsLoad(feed) && !(streamed?.[cityId(feed)] && feed.state.current.status === 'idle'));
		if (stale.length === 1) stale[0].load();
		else if (stale.length > 1) loadRegion(region, stale, locale);
	}, [configured, feeds, region, streamed, locale]);

	// Newest reading across the region, shown once in the phone toolbar instead of only per card.
	const latest = feeds.reduce<{ time: string; timeZone: string } | null>((best, feed, i) => {
		const current = states[i].current;
		if (current.status !== 'success') return best;
		const time = current.data.dataTime;
		return !best || time > best.time ? { time, timeZone: feed.location.timeZone } : best;
	}, null);

	function refreshAll() {
		if (anyBusy) return;
		loadRegion(region, feeds, locale);
	}

	const listActions = (
		<div className="flex items-center gap-2">
			<SortFilter value={filter} onApply={setFilter} bandCounts={bandCounts} pendingCount={pendingCount} />
			<Button
				variant="outline"
				size="lg"
				className="h-11 w-11 gap-2 rounded-full border-input bg-card px-0 text-muted-foreground lg:w-auto lg:px-4"
				disabled={anyBusy || !configured}
				onClick={refreshAll}
				aria-label={anyBusy ? t.dashboard.refreshingData : t.dashboard.refreshData}
				aria-busy={anyBusy}
				title={anyBusy ? t.dashboard.refreshingData : t.dashboard.refreshData}
			>
				<RotateCw className={cn('size-4', anyBusy && 'motion-safe:animate-spin')} aria-hidden="true" />
				<span className="hidden lg:inline">{anyBusy ? t.dashboard.refreshingData : t.dashboard.refreshData}</span>
			</Button>
		</div>
	);

	return (
		<>
			<div className="page-frame pt-5">
				{/*
				  Sky panel. From lg up, its bottom-left corner is cut into a notch (page background, concave
				  fillets) that holds the list title and region switch, so they read as the top of the card list.
				*/}
				{/* Only the background is clipped so the buttons keep their focus outlines. */}
				<section aria-labelledby="page-title" className="relative rounded-[20px] bg-linear-to-b from-sky to-sky/60 sm:rounded-[28px]">
					<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
						{/* Bumi dan Atmosfer: the selected Earth horizon image. */}
						<Image
							src="/images/headers/bumi-dan-atmosfer.png"
							alt=""
							fill
							loading="eager"
							fetchPriority="high"
							quality={90}
							// Phones crop the 3:1 image to a tall box, so it renders about three times the box height
							// wide (~1400px): asking for that loads the full-resolution file instead of a blurry 828px one.
							sizes="(max-width: 639px) 1400px, (max-width: 1280px) 100vw, 1280px"
							className="object-cover object-right sm:object-center"
						/>
						{/* Phones: strong behind the text (top left), clear toward the island (right). */}
						<div className="absolute inset-0 bg-linear-to-br from-sky/95 via-sky/75 to-sky/5 sm:bg-linear-to-r sm:from-sky/95 sm:via-sky/60 sm:to-sky/10" />
					</div>
					<div className="relative flex flex-wrap items-end justify-between gap-6 px-5 pt-10 pb-10 sm:px-10 md:pt-14 lg:pb-28">
						<div className="min-w-0 flex-1 basis-[28rem]">
							<h1 id="page-title" className="page-title max-w-[18ch] lg:text-6xl">
								{t.dashboard.heading}
							</h1>
							<p className="body-copy mt-3 max-w-[52ch] text-pretty text-muted-foreground sm:text-lg">{t.dashboard.lead}</p>
						</div>
						<Button asChild size="lg" className="h-11 rounded-full px-5">
							<Link href="/location/me">
								<LocateFixed data-icon="inline-start" />
								{t.dashboard.useMyLocation}
							</Link>
						</Button>
					</div>

					<div className="absolute bottom-0 left-0 hidden rounded-tr-[20px] bg-background pt-3 pr-5 lg:block">
						<span aria-hidden="true" className="absolute bottom-full left-0 size-5 bg-[radial-gradient(circle_at_100%_0,transparent_19.5px,var(--background)_20px)]" />
						<span aria-hidden="true" className="absolute bottom-0 left-full size-5 bg-[radial-gradient(circle_at_100%_0,transparent_19.5px,var(--background)_20px)]" />
						{/* The region is the list heading; the bar beside it sums the region up and filters by band. */}
						<div className="flex items-center gap-4">
							<h2 className="flex">
								<span className="sr-only">{t.dashboard.overviewPrefix}</span>
								<RegionPicker value={region} onChange={setRegion} variant="display" />
							</h2>
							<AqiSpread bandCounts={bandCounts} pendingCount={pendingCount} filter={filter} onFilter={setFilter} />
						</div>
					</div>
					<div className="absolute right-4 bottom-4 hidden lg:flex">{listActions}</div>
					{/* UAQI runs the opposite way to ISPU, so the explanation stays one tap away, under the hero beside the cards it explains. */}
					<Link
						href="/about"
						className="absolute top-full right-1 mt-1 hidden min-h-8 items-center text-sm font-medium text-primary underline-offset-4 hover:underline lg:inline-flex"
					>
						{t.common.scale} {t.common.howToRead}
					</Link>
				</section>

				{/*
				  Phones: keep the filter label visible and let the actions wrap when the region needs more room.
				  The band bar spans the full width, with its summary and the data time below it.
				*/}
				<div className="grid gap-3 pt-5 lg:hidden">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="flex max-w-full min-w-0">
							<span className="sr-only">{t.dashboard.overviewPrefix}</span>
							<RegionPicker value={region} onChange={setRegion} variant="title" />
						</h2>
						<div className="ml-auto shrink-0">{listActions}</div>
					</div>
					<AqiSpread
						layout="stacked"
						bandCounts={bandCounts}
						pendingCount={pendingCount}
						filter={filter}
						onFilter={setFilter}
						aside={
							latest && (
								<span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs font-medium text-foreground tabular-nums ring-1 ring-border">
									<Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
									{fill(t.dashboard.dataAt, { time: `${formatHour(latest.time, latest.timeZone, locale)} ${timeZoneLabel(latest.timeZone, new Date(latest.time))}` })}
								</span>
							)
						}
					/>
					{/* Off the photo, where it reads clearly: the fact stays quiet and only the action is a link color. */}
					<Link href="/about" className="group min-h-8 justify-self-start text-sm text-pretty text-muted-foreground">
						{t.common.scale} <span className="font-medium text-primary underline-offset-4 group-hover:underline">{t.common.howToRead}</span>
					</Link>
				</div>
			</div>

			<div className="page-frame grid gap-12 pt-6 lg:pt-12">
				<section aria-label={t.dashboard.listLabel}>
					<p className="sr-only" role="status">
						{announcement}
					</p>
					<CityList
						configured={configured}
						visible={visible}
						hiddenCount={hiddenCount}
						streamed={streamed}
						onReset={() => setFilter(DEFAULT_FILTER)}
					/>
				</section>
			</div>
		</>
	);
}
