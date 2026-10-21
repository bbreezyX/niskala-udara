'use client';

import { ChevronDown, RotateCw } from 'lucide-react';
import { FIRE_WINDOW_HOURS } from '@/lib/config/map';
import { UAQI_GRADIENT } from '@/lib/aqi';
import type { Remote } from '@/lib/client/api';
import { formatDataTime, formatHour, numberFormat, timeZoneLabel } from '@/lib/format';
import { fill, plural } from '@/lib/i18n/config';
import { ISPU_BANDS } from '@/lib/ispu';
import type { KlhkNationalData } from '@/lib/server/klhk-ispu';
import type { FireData, WindData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useDictionary, useLocale } from './locale-provider';
import { LEVELS } from './map-hotspots';

/** Only called for data fetched in the browser, so it never runs during server rendering. */
function viewerTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Wind at the map centre: speed in m/s and the bearing it blows toward. */
export interface CentreWind {
	speed: number;
	toward: number;
}

/** Below this (m/s) the air is calm and has no meaningful direction. */
const CALM = 0.5;

/** The hotspot count leads: it is what changes day to day. Its legend doubles as the breakdown. */
export function FiresSummary({ configured, fires, onRetry }: { configured: boolean; fires: Remote<FireData>; onRetry: () => void }) {
	const t = useDictionary();
	return (
		<section className="grid gap-3 p-5" aria-live="polite" aria-labelledby="fires-title">
			<h2 id="fires-title" className="panel-title">
				{fill(t.map.firesTitle, { n: String(FIRE_WINDOW_HOURS) })}
			</h2>
			<FiresBody configured={configured} fires={fires} onRetry={onRetry} />
		</section>
	);
}

function FiresBody({ configured, fires, onRetry }: { configured: boolean; fires: Remote<FireData>; onRetry: () => void }) {
	const t = useDictionary();
	if (!configured) return <p className="body-copy text-muted-foreground">{t.map.firesUnconfigured}</p>;
	if (fires.status === 'success') return <FireCounts data={fires.data} />;
	if (fires.status === 'error') {
		return (
			<>
				<p className="text-sm font-semibold text-destructive">{t.map.firesFailed}</p>
				<Button variant="outline" size="lg" className="justify-self-start" onClick={onRetry}>
					<RotateCw data-icon="inline-start" />
					{t.common.retry}
				</Button>
			</>
		);
	}
	return (
		<div className="grid gap-3">
			<Skeleton className="h-12 w-28 rounded-lg" />
			<Skeleton className="h-2 rounded-full" />
			<Skeleton className="h-16 rounded-lg" />
		</div>
	);
}

function FireCounts({ data }: { data: FireData }) {
	const t = useDictionary();
	const locale = useLocale();
	const { hotspots } = data;
	const counts = { high: 0, nominal: 0, low: 0 };
	for (const hotspot of hotspots) counts[hotspot.confidence]++;
	const latest = hotspots[0]?.acquiredAt ?? null;
	// Hotspots span three time zones; the summary uses the reader's own, labelled.
	const zone = viewerTimeZone();

	return (
		<>
			<p className="-mt-1 flex items-baseline gap-2">
				<span className="font-sans text-5xl leading-none font-semibold tabular-nums">{hotspots.length}</span>
				<span className="text-muted-foreground">{plural(t.map.detections, hotspots.length, locale)}</span>
			</p>
			{hotspots.length > 0 && (
				<div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
					{LEVELS.map(([key, level]) => (
						<span key={key} style={{ flexGrow: counts[key], background: level.color }} />
					))}
				</div>
			)}
			<ul className="grid gap-1.5 text-sm">
				{LEVELS.map(([key, level]) => (
					<li key={key} className="flex items-center gap-2">
						<span className="size-2.5 shrink-0 rounded-full" style={{ background: level.color }} aria-hidden="true" />
						{t.map.confidence[key]}
						<span className="ml-auto font-semibold tabular-nums">{counts[key]}</span>
					</li>
				))}
			</ul>
			<p className="meta-copy text-muted-foreground">
				{latest && fill(t.map.lastDetected, { time: formatDataTime(latest, zone, locale) })}
				{fill(t.map.updated, { time: `${formatHour(data.fetchedAt, zone, locale)} ${timeZoneLabel(zone)}` })}
			</p>
			{data.missingSources.length > 0 && <p className="meta-copy text-muted-foreground">{t.map.missingSources}</p>}
		</>
	);
}

interface LayerControlsProps {
	showHeatmap: boolean;
	onShowHeatmap: (checked: boolean) => void;
	showFires: boolean;
	onShowFires: (checked: boolean) => void;
	showWind: boolean;
	onShowWind: (checked: boolean) => void;
	wind: Remote<WindData>;
	centreWind: CentreWind | null;
	onRetryWind: () => void;
	mapReady: boolean;
	firesConfigured: boolean;
	showStations: boolean;
	onShowStations: (checked: boolean) => void;
	stations: Remote<KlhkNationalData>;
	onRetryStations: () => void;
}

export function LayerControls(props: LayerControlsProps) {
	const { showHeatmap, onShowHeatmap, showFires, onShowFires, showWind, onShowWind, wind, mapReady, firesConfigured } = props;
	const { showStations, onShowStations, stations } = props;
	const t = useDictionary();
	return (
		<section className="grid gap-1 p-5" aria-labelledby="layers-title">
			<h2 id="layers-title" className="sr-only">
				{t.map.layers}
			</h2>
			<div className="flex min-h-11 items-center justify-between gap-3">
				<Label htmlFor="layer-heatmap" className="font-semibold">
					{t.map.airQuality}
				</Label>
				<Switch id="layer-heatmap" checked={showHeatmap} onCheckedChange={onShowHeatmap} disabled={!mapReady} />
			</div>
			{/* The heatmap uses Google's continuous UAQI colors, so the legend does too. */}
			<div className="h-2 rounded-full" style={{ background: UAQI_GRADIENT }} aria-hidden="true" />
			<div className="meta-copy flex justify-between text-muted-foreground">
				<span>{t.map.scaleLow}</span>
				<span>{t.map.scaleHigh}</span>
			</div>
			<div className="mt-2 flex min-h-11 items-center justify-between gap-3">
				<Label htmlFor="layer-stations" className="font-semibold">
					{t.map.stations.title}
				</Label>
				<Switch
					id="layer-stations"
					checked={showStations}
					onCheckedChange={onShowStations}
					disabled={!mapReady || stations.status !== 'success'}
				/>
			</div>
			<StationsStatus {...props} />
			<div className="mt-2 flex min-h-11 items-center justify-between gap-3">
				<Label htmlFor="layer-fires" className="font-semibold">
					{t.map.hotspots}
				</Label>
				<Switch id="layer-fires" checked={showFires} onCheckedChange={onShowFires} disabled={!mapReady || !firesConfigured} />
			</div>
			<div className="mt-2 flex min-h-11 items-center justify-between gap-3">
				<Label htmlFor="layer-wind" className="font-semibold">
					{t.map.wind}
				</Label>
				<Switch id="layer-wind" checked={showWind} onCheckedChange={onShowWind} disabled={!mapReady || wind.status !== 'success'} />
			</div>
			<WindStatus {...props} />
		</section>
	);
}

/**
 * KLH's five ISPU bands as one segmented bar, laid out like the heatmap legend above it so the panel reads as one
 * set; the band names stay available to screen readers. Then how many stations are reporting.
 */
function StationsStatus({ stations, onRetryStations }: LayerControlsProps) {
	const t = useDictionary();
	const locale = useLocale();
	if (stations.status === 'error') {
		return (
			<div className="flex items-center justify-between gap-3 text-sm">
				<p className="font-semibold text-destructive">{t.map.stations.failed}</p>
				<Button variant="outline" size="sm" onClick={onRetryStations}>
					<RotateCw data-icon="inline-start" />
					{t.common.retry}
				</Button>
			</div>
		);
	}
	if (stations.status !== 'success') return <Skeleton className="h-12 rounded-md" />;
	const { stations: list, missingProvinces } = stations.data;
	return (
		<>
			<ul className="flex h-2 overflow-hidden rounded-full" aria-label={t.aqi.categories}>
				{ISPU_BANDS.map((band) => (
					<li key={band.key} className="flex-1" style={{ background: band.color }}>
						<span className="sr-only">{t.ispu.bands[band.key]}</span>
					</li>
				))}
			</ul>
			<div className="meta-copy flex justify-between text-muted-foreground">
				<span>{t.map.stations.scaleLow}</span>
				<span>{t.map.stations.scaleHigh}</span>
			</div>
			<p className="meta-copy text-muted-foreground">
				{plural(t.map.stations.count, list.length, locale)}
				{missingProvinces.length > 0 && ` ${t.map.stations.missing}`}
			</p>
		</>
	);
}

/** What the wind layer shows, in words: the reading at the map centre and the hour it is for. */
function WindStatus({ wind, centreWind, onRetryWind }: LayerControlsProps) {
	const t = useDictionary();
	const locale = useLocale();
	if (wind.status === 'error') {
		return (
			<div className="flex items-center justify-between gap-3 text-sm">
				<p className="font-semibold text-destructive">{t.map.windFailed}</p>
				<Button variant="outline" size="sm" onClick={onRetryWind}>
					<RotateCw data-icon="inline-start" />
					{t.common.retry}
				</Button>
			</div>
		);
	}
	if (wind.status !== 'success') return <Skeleton className="h-9 rounded-md" />;

	const zone = viewerTimeZone();
	let reading: string | null = null;
	if (centreWind) {
		const speed = numberFormat(locale, 0).format(centreWind.speed * 3.6);
		reading =
			centreWind.speed < CALM
				? t.map.windCalm
				: fill(t.map.windCentre, { speed, toward: t.map.compass[Math.round(centreWind.toward / 45) % 8] });
	}
	return (
		<div className="meta-copy grid gap-1 text-muted-foreground" aria-live="polite">
			{reading && <p className="text-sm text-foreground">{reading}</p>}
			<p>{t.map.windLegend}</p>
			<p>{fill(t.map.windValid, { time: `${formatHour(wind.data.validAt, zone, locale)} ${timeZoneLabel(zone)}` })}</p>
		</div>
	);
}

export function MapAbout() {
	const t = useDictionary();
	return (
		<div className="meta-copy grid gap-3 p-5 text-muted-foreground">
			<details className="group">
				<summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 rounded-md font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
					{t.map.about}
					<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
				</summary>
				<p className="body-copy mt-3">{t.map.aboutText}</p>
			</details>
			{/* Attribution stays visible, outside the disclosure. */}
			<p className="grid gap-0.5">
				<span lang="en" translate="no">
					Source: Includes air quality data from Google
				</span>
				<span>
					{t.footer.ispuSource}{' '}
					<a href="https://ispu.kemenlh.go.id/" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
						KLH/BPLH
					</a>
				</span>
				<span>
					{t.map.hotspotSource}{' '}
					<a href="https://firms.modaps.eosdis.nasa.gov/" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
						NASA FIRMS
					</a>{' '}
					(LANCE/ESDIS)
				</span>
				<span>
					{t.map.windSource}{' '}
					<a href="https://open-meteo.com/" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
						Open-Meteo
					</a>{' '}
					(
					<a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
						CC BY 4.0
					</a>
					)
				</span>
			</p>
		</div>
	);
}
