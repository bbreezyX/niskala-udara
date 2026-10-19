'use client';

import { ChevronDown, RotateCw } from 'lucide-react';
import { FIRE_WINDOW_HOURS, MAP_TIME_ZONE } from '@/lib/config/map';
import { UAQI_GRADIENT } from '@/lib/aqi';
import type { Remote } from '@/lib/client/api';
import { formatDataTime, formatHour, timeZoneLabel } from '@/lib/format';
import { fill, plural } from '@/lib/i18n/config';
import type { FireData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useDictionary, useLocale } from './locale-provider';
import { LEVELS } from './map-hotspots';

/** The hotspot count leads: it is what changes day to day. Its legend doubles as the breakdown. */
export function FiresSummary({ configured, fires, onRetry }: { configured: boolean; fires: Remote<FireData>; onRetry: () => void }) {
	const t = useDictionary();
	return (
		<section className="grid gap-3 p-5" aria-live="polite" aria-labelledby="fires-title">
			<h2 id="fires-title" className="text-sm font-semibold text-muted-foreground">
				{fill(t.map.firesTitle, { n: String(FIRE_WINDOW_HOURS) })}
			</h2>
			<FiresBody configured={configured} fires={fires} onRetry={onRetry} />
		</section>
	);
}

function FiresBody({ configured, fires, onRetry }: { configured: boolean; fires: Remote<FireData>; onRetry: () => void }) {
	const t = useDictionary();
	if (!configured) return <p className="text-sm text-muted-foreground">{t.map.firesUnconfigured}</p>;
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

	return (
		<>
			<p className="-mt-1 flex items-baseline gap-2">
				<span className="font-display text-5xl leading-none tabular-nums">{hotspots.length}</span>
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
			<p className="text-xs text-muted-foreground">
				{latest && fill(t.map.lastDetected, { time: formatDataTime(latest, MAP_TIME_ZONE, locale) })}
				{fill(t.map.updated, { time: `${formatHour(data.fetchedAt, MAP_TIME_ZONE, locale)} ${timeZoneLabel(MAP_TIME_ZONE)}` })}
			</p>
			{data.missingSources.length > 0 && <p className="text-xs text-muted-foreground">{t.map.missingSources}</p>}
		</>
	);
}

interface LayerControlsProps {
	showHeatmap: boolean;
	onShowHeatmap: (checked: boolean) => void;
	showFires: boolean;
	onShowFires: (checked: boolean) => void;
	mapReady: boolean;
	firesConfigured: boolean;
}

export function LayerControls({ showHeatmap, onShowHeatmap, showFires, onShowFires, mapReady, firesConfigured }: LayerControlsProps) {
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
			<div className="flex justify-between text-xs text-muted-foreground">
				<span>{t.map.scaleLow}</span>
				<span>{t.map.scaleHigh}</span>
			</div>
			<div className="mt-2 flex min-h-11 items-center justify-between gap-3">
				<Label htmlFor="layer-fires" className="font-semibold">
					{t.map.hotspots}
				</Label>
				<Switch id="layer-fires" checked={showFires} onCheckedChange={onShowFires} disabled={!mapReady || !firesConfigured} />
			</div>
		</section>
	);
}

export function MapAbout() {
	const t = useDictionary();
	return (
		<div className="grid gap-3 p-5 text-xs text-muted-foreground">
			<details className="group">
				<summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 rounded-md font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
					{t.map.about}
					<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
				</summary>
				<p className="mt-2 leading-relaxed">{t.map.aboutText}</p>
			</details>
			{/* Attribution stays visible, outside the disclosure. */}
			<p className="grid gap-0.5">
				<span lang="en" translate="no">
					Source: Includes air quality data from Google
				</span>
				<span>
					{t.map.hotspotSource}{' '}
					<a href="https://firms.modaps.eosdis.nasa.gov/" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
						NASA FIRMS
					</a>{' '}
					(LANCE/ESDIS)
				</span>
			</p>
		</div>
	);
}
