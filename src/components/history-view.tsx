'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { CITIES, DEFAULT_REGION, type City, type RegionId } from '@/lib/config/cities';
import { HISTORY_RANGES, type HistoryRange } from '@/lib/coordinates';
import { postJson, toRemote, withLanguage, type Remote } from '@/lib/client/api';
import { useRememberedRegion } from '@/lib/client/region-memory';
import { formatDay, formatHour, timeZoneLabel, type ClientErrorCode } from '@/lib/format';
import { dailyPattern, dayRows, hourSlots, summarize } from '@/lib/history';
import { fill } from '@/lib/i18n/config';
import type { AirQualityData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CityPicker, useNearby, type Nearby } from './city-picker';
import { HistoryChart } from './history-chart';
import { DaysTile } from './history-days';
import { DominantTile } from './history-dominant';
import { HourTile } from './history-hour';
import { PatternTile } from './history-pattern';
import { SummaryTile } from './history-summary';
import { HoursTable } from './history-table';
import { Attribution, DataUnavailable, Recommendation } from './info-blocks';
import { useDictionary, useLocale } from './locale-provider';
import { PageIntro } from './page-intro';

const TILE = 'rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6';

/** The first city of the region remembered on this device, else of the default region. */
function firstCity(remembered: RegionId | null): City {
	const region = remembered ?? DEFAULT_REGION;
	return CITIES.find((c) => c.region === region) ?? CITIES[0];
}

export function HistoryView({ configured, title }: { configured: boolean; title: string }) {
	const locale = useLocale();
	const t = useDictionary();
	// The city the user picked; until then, the nearest one (when location access was already granted)
	// or the first city of the region remembered on this device, else of the default region.
	const [pickedId, setPickedId] = useState<string | null>(null);
	const { nearby, locate } = useNearby();
	const [range, setRange] = useState<HistoryRange>(HISTORY_RANGES[0]);
	const [history, setHistory] = useState<Remote<AirQualityData[]>>({ status: 'idle' });
	const [selectedTime, setSelectedTime] = useState<number | null>(null);
	const [reloadVersion, setReloadVersion] = useState(0);

	const fallback = firstCity(useRememberedRegion());
	const city =
		CITIES.find((c) => c.id === pickedId) ?? (nearby.status === 'ready' ? nearby.list[0].city : fallback);
	// Hold the first request while an automatic location lookup may still change the city.
	const settling = pickedId === null && (nearby.status === 'checking' || (nearby.status === 'locating' && nearby.auto));

	// One request per city/range; a newer selection aborts the older one.
	useEffect(() => {
		if (!configured) return;
		setHistory({ status: 'loading' });
		if (settling) return;
		const controller = new AbortController();
		setSelectedTime(null);
		postJson<AirQualityData[]>(
			withLanguage('/api/air-quality/history', locale),
			{ latitude: city.latitude, longitude: city.longitude, hours: range },
			controller.signal
		).then((result) => {
			if (result) setHistory(toRemote(result));
		});
		return () => controller.abort();
	}, [configured, settling, city.latitude, city.longitude, range, reloadVersion, locale]);

	const hours = useMemo(() => (history.status === 'success' ? history.data : []), [history]);

	if (!configured) {
		return (
			<div className="grid gap-6">
				<PageIntro title={title} />
				<DataUnavailable title={t.errors.not_configured.title} description={t.errors.not_configured.description} />
			</div>
		);
	}

	return (
		<div className="grid gap-6">
			<HistoryHeader
				title={title}
				city={city}
				hours={hours}
				nearby={nearby}
				onPick={(next) => setPickedId(next.id)}
				onLocate={() => locate(false, (nearest) => setPickedId(nearest.id))}
				range={range}
				onRange={setRange}
			/>
			{history.status === 'error' ? (
				<HistoryError code={history.code} onRetry={() => setReloadVersion((v) => v + 1)} />
			) : hours.length > 0 ? (
				<HistoryBody hours={hours} range={range} city={city} selectedTime={selectedTime} onSelectTime={setSelectedTime} />
			) : (
				<HistorySkeleton name={city.name} />
			)}
		</div>
	);
}

/** Title, the span the data covers, and the two choices that change it: city and range. */
function HistoryHeader({
	title,
	city,
	hours,
	nearby,
	onPick,
	onLocate,
	range,
	onRange
}: {
	title: string;
	city: City;
	hours: AirQualityData[];
	nearby: Nearby;
	onPick: (city: City) => void;
	onLocate: () => void;
	range: HistoryRange;
	onRange: (range: HistoryRange) => void;
}) {
	const locale = useLocale();
	const t = useDictionary();
	const first = hours[0];
	const latest = hours.at(-1);
	const stamp = (iso: string) => `${formatDay(iso, city.timeZone, locale)} ${formatHour(iso, city.timeZone, locale)}`;

	return (
		<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
			<div className="grid min-w-0 gap-2">
				<PageIntro title={title} />
				{first && latest && (
					<p className="text-sm text-muted-foreground">
						{fill(t.history.meta, {
							name: city.name,
							from: stamp(first.dataTime),
							to: stamp(latest.dataTime),
							zone: timeZoneLabel(city.timeZone)
						})}{' '}
						· {fill(t.history.latest, { time: formatHour(latest.dataTime, city.timeZone, locale) })}
					</p>
				)}
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<CityPicker value={city} onChange={onPick} nearby={nearby} onLocate={onLocate} />
				<ToggleGroupPrimitive.Root
					type="single"
					value={String(range)}
					// Radix lets a single toggle group be emptied; a range must always be chosen.
					onValueChange={(next) => {
						if (next) onRange(Number(next) as HistoryRange);
					}}
					aria-label={t.history.rangeLabel}
					className="flex rounded-full bg-muted p-1"
				>
					{HISTORY_RANGES.map((n) => (
						<ToggleGroupPrimitive.Item
							key={n}
							value={String(n)}
							className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
						>
							{fill(t.history.rangeOption, { n: String(n) })}
						</ToggleGroupPrimitive.Item>
					))}
				</ToggleGroupPrimitive.Root>
			</div>
		</div>
	);
}

function HistoryBody({
	hours,
	range,
	city,
	selectedTime,
	onSelectTime
}: {
	hours: AirQualityData[];
	range: HistoryRange;
	city: City;
	selectedTime: number | null;
	onSelectTime: (time: number | null) => void;
}) {
	const t = useDictionary();
	const hourTile = useRef<HTMLElement>(null);
	const slots = useMemo(() => hourSlots(hours, range), [hours, range]);
	const summary = useMemo(() => summarize(hours), [hours]);
	const pattern = useMemo(() => dailyPattern(hours, city.timeZone), [hours, city.timeZone]);
	const days = useMemo(() => dayRows(slots, city.timeZone), [slots, city.timeZone]);

	const latest = hours[hours.length - 1];
	const selected = hours.find((hour) => Date.parse(hour.dataTime) === selectedTime) ?? latest;
	const selectedT = Date.parse(selected.dataTime);

	function select(time: number) {
		onSelectTime(time);
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		hourTile.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
	}

	return (
		<div className="grid gap-4">
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
				<SummaryTile summary={summary} range={range} total={hours.length} timeZone={city.timeZone} />
				<section aria-labelledby="history-chart" className={`grid content-start gap-4 ${TILE}`}>
					<div className="grid gap-1">
						<h2 id="history-chart" className="panel-title">
							{t.history.chart.title}
						</h2>
						<p className="text-sm text-muted-foreground">{t.history.chart.note}</p>
					</div>
					<HistoryChart
						slots={slots}
						timeZone={city.timeZone}
						selected={selectedT}
						marks={{ worst: summary.worst, best: summary.best, latest }}
						onSelect={select}
						label={fill(t.history.trendLabel, { name: city.name, n: String(range) })}
					/>
				</section>
			</div>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
				<div className="grid md:col-span-2 xl:col-span-5">
					<PatternTile pattern={pattern} range={range} />
				</div>
				<div className="grid xl:col-span-3">
					<DominantTile dominant={summary.dominant} total={hours.length} />
				</div>
				<div className="grid xl:col-span-4">
					<DaysTile rows={days} timeZone={city.timeZone} />
				</div>
			</div>
			<div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<HourTile ref={hourTile} hour={selected} timeZone={city.timeZone} isLatest={selected === latest} onBack={() => onSelectTime(null)} />
				<Recommendation
					aqi={selected.index.aqi}
					recommendations={selected.recommendations ?? {}}
					className={`content-start border-0 ${TILE}`}
				/>
			</div>
			<HoursTable slots={slots} city={city} selected={selectedT} onSelect={select} />
			<Attribution />
		</div>
	);
}

/** Same rows and heights as the loaded page, so nothing shifts when the data arrives. */
function HistorySkeleton({ name }: { name: string }) {
	const t = useDictionary();
	return (
		<div className="grid gap-4">
			<p role="status" className="sr-only">
				{fill(t.common.loadingPlace, { name })}
			</p>
			<div aria-hidden="true" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
				<Skeleton className="h-96 rounded-2xl" />
				<Skeleton className="h-96 rounded-2xl" />
			</div>
			<div aria-hidden="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
				<Skeleton className="h-56 rounded-2xl md:col-span-2 xl:col-span-5" />
				<Skeleton className="h-56 rounded-2xl xl:col-span-3" />
				<Skeleton className="h-56 rounded-2xl xl:col-span-4" />
			</div>
			<div aria-hidden="true" className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<Skeleton className="h-80 rounded-2xl" />
				<Skeleton className="h-80 rounded-2xl" />
			</div>
			<Skeleton aria-hidden="true" className="h-14 rounded-2xl" />
		</div>
	);
}

/** Why the history failed to load, with a way to ask again. */
function HistoryError({ code, onRetry }: { code: ClientErrorCode; onRetry: () => void }) {
	const t = useDictionary();
	return (
		<div role="alert" className="grid justify-items-start gap-2 rounded-xl bg-destructive/5 p-6">
			<p className="font-semibold text-destructive">{t.errors[code].title}</p>
			<p className="text-sm text-muted-foreground">{t.errors[code].description}</p>
			<Button size="lg" className="mt-2" onClick={onRetry}>
				{t.common.retry}
			</Button>
		</div>
	);
}
