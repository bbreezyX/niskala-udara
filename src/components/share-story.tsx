'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CircleFadingPlus, LoaderCircle, RotateCw } from 'lucide-react';
import type { WatchLocation } from '@/lib/client/location-feed';
import { renderStory, type StoryContent } from '@/lib/client/story-image';
import type { KlhkStation } from '@/lib/server/klhk-ispu';
import { aqiBand, aqiBandIndex } from '@/lib/aqi';
import { formatConcentration, formatHour, POLLUTANT_LABELS, timeZoneLabel, unitLabel } from '@/lib/format';
import { fill, INTL_LOCALES, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import { ispuBand, ISPU_HAZARDOUS_FROM } from '@/lib/ispu';
import type { AirQualityData, PollutantCode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useDictionary, useLocale } from './locale-provider';

/** The dashboard card's four readings, so the story looks like the card people already know. */
const STORY_POLLUTANTS: PollutantCode[] = ['pm25', 'pm10', 'no2', 'o3'];

const noSubscribe = () => () => {};
let shareable: boolean | undefined;

/**
 * Phones get the share sheet, where Instagram offers Stories. Desktop share sheets have no Instagram,
 * so desktops download the PNG instead.
 */
function canShareImage(): boolean {
	shareable ??=
		typeof navigator.canShare === 'function' &&
		matchMedia('(pointer: coarse)').matches &&
		navigator.canShare({ files: [new File([], 'niskala.png', { type: 'image/png' })] });
	return shareable;
}

function fileName(name: string): string {
	const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	return `niskala-${slug || 'udara'}.png`;
}

function download(file: File) {
	const url = URL.createObjectURL(file);
	const link = document.createElement('a');
	link.href = url;
	link.download = file.name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** ISPU as IspuChip shows it: a station reading first, else Google's model value, capped at Berbahaya. */
function storyIspu(t: Dictionary, current: AirQualityData, station: KlhkStation | null, hourAt: (iso: string) => string) {
	if (station) {
		const band = ispuBand(station.ispu);
		return {
			ispu: { label: `${t.ispu.label} ${station.ispu}`, category: t.ispu.bands[band.key], color: band.color },
			source: fill(t.ispu.sourceStation, { name: station.name, time: hourAt(station.observedAt) })
		};
	}
	if (!current.ispu) return { ispu: null, source: null };
	const { aqi, aqiDisplay, category, color } = current.ispu;
	const band = ispuBand(aqi);
	const hazardous = aqi >= ISPU_HAZARDOUS_FROM;
	return {
		ispu: {
			label: `${t.ispu.label} ${hazardous ? fill(t.ispu.atLeast, { value: String(ISPU_HAZARDOUS_FROM) }) : aqiDisplay}`,
			category: hazardous ? t.ispu.bands.hazardous : (category ?? t.ispu.bands[band.key]),
			color: hazardous ? band.color : (color ?? band.color)
		},
		source: t.ispu.sourceModel
	};
}

function storyContent(
	t: Dictionary,
	locale: Locale,
	location: WatchLocation,
	place: string,
	current: AirQualityData,
	future: AirQualityData[],
	station: KlhkStation | null
): StoryContent {
	const { timeZone } = location;
	const hourAt = (iso: string) => `${formatHour(iso, timeZone, locale)} ${timeZoneLabel(timeZone, new Date(iso))}`;
	const day = new Intl.DateTimeFormat(INTL_LOCALES[locale], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone });
	const { ispu, source } = storyIspu(t, current, station, hourAt);
	// The current hour leads the line, then up to 24 forecast hours, as on the dashboard card.
	const hours = [current, ...future.filter((h) => h.dataTime > current.dataTime)].slice(0, 25);

	return {
		date: `${day.format(new Date(current.dataTime))} · ${hourAt(current.dataTime)}`,
		name: location.name,
		place,
		aqi: current.index.aqi,
		aqiDisplay: current.index.aqiDisplay,
		category: current.index.category ?? t.aqi.bands[aqiBand(current.index.aqi).key],
		color: current.index.color,
		ispu,
		headline: t.health.headlines[aqiBandIndex(current.index.aqi)],
		pollutants: STORY_POLLUTANTS.map((code) => {
			const reading = current.pollutants.find((p) => p.code === code);
			return {
				label: POLLUTANT_LABELS[code],
				value: reading ? formatConcentration(reading.value, locale) : '–',
				unit: reading ? unitLabel(reading.units) : ''
			};
		}),
		forecast:
			hours.length > 1
				? {
						title: t.card.forecast24,
						values: hours.map((h) => h.index.aqi),
						ticks: [0, 1, 2, 3].map((k) => {
							const index = Math.round(((hours.length - 1) * k) / 3);
							return { index, label: formatHour(hours[index].dataTime, timeZone, locale) };
						})
					}
				: null,
		sources: source ? [source] : []
	};
}

interface Props {
	location: WatchLocation;
	/** The line under the name on the page: the province or the location's note. */
	place: string;
	current: AirQualityData;
	future: AirQualityData[];
	/** From `useKlhkStation`: undefined while loading. */
	station: KlhkStation | null | undefined;
	/**
	 * `detail`: an outlined button drawn ahead of the tap, since the page shows one location.
	 * `card`: a quiet button drawn only on the tap, so a dashboard never draws every card it shows.
	 */
	placement: 'detail' | 'card';
}

type Prepared = { content: StoryContent; file: Promise<File> } | null;

/** The image for this content: the one already drawn or drawing, or a new draw. */
function prepare(prepared: { current: Prepared }, content: StoryContent, name: string): Promise<File> {
	if (prepared.current?.content !== content) {
		const file = renderStory(content, name);
		// Kept quiet here; a failed draw is retried on the tap.
		file.catch(() => {});
		prepared.current = { content, file };
	}
	return prepared.current.file;
}

/** Shares the reading as a 1080 x 1920 story image, or downloads it where no share sheet can take a file. */
export function ShareStory({ location, place, current, future, station, placement }: Props) {
	const t = useDictionary();
	const locale = useLocale();
	const share = useSyncExternalStore(noSubscribe, canShareImage, () => false);
	const [status, setStatus] = useState<'idle' | 'busy' | 'retap' | 'failed'>('idle');
	const prepared = useRef<Prepared>(null);
	const name = fileName(location.name);
	const eager = placement === 'detail';

	// Waits for the station lookup, so the image never shows Google's ISPU where a station reading is coming.
	const content = useMemo(
		() => (station === undefined ? null : storyContent(t, locale, location, place, current, future, station)),
		[t, locale, location, place, current, future, station]
	);

	// iOS refuses the share sheet once a slow await has used up the tap's activation, so the detail page draws first.
	useEffect(() => {
		if (eager && content) prepare(prepared, content, name);
	}, [eager, content, name]);

	async function onClick() {
		if (!content || status === 'busy') return;
		const retap = status === 'retap';
		setStatus('busy');
		try {
			let image: File;
			try {
				image = await prepare(prepared, content, name);
			} catch {
				prepared.current = null;
				image = await prepare(prepared, content, name);
			}
			if (share) {
				try {
					await navigator.share({ files: [image] });
					setStatus('idle');
					return;
				} catch (error) {
					const reason = error instanceof DOMException ? error.name : null;
					if (reason === 'AbortError') {
						setStatus('idle');
						return;
					}
					// The draw outlasted the tap's activation: the image is ready now, so the next tap shares at once.
					// Refused twice means it is not the activation, so the download takes over.
					if (reason === 'NotAllowedError' && !retap) {
						setStatus('retap');
						return;
					}
				}
			}
			download(image);
			setStatus('idle');
		} catch {
			setStatus('failed');
		}
	}

	// The "add to story" glyph on every device, so the button reads the same whether it shares or downloads.
	const Icon = status === 'busy' ? LoaderCircle : status === 'failed' ? RotateCw : CircleFadingPlus;
	const spoken = {
		idle: fill(share ? t.share.shareLabel : t.share.downloadLabel, { name: location.name }),
		busy: t.share.preparing,
		retap: fill(t.share.retapLabel, { name: location.name }),
		failed: t.share.failed
	}[status];
	// Only the retap step shows words: it asks for an action an icon cannot ask for.
	const labelled = status === 'retap';

	return (
		<Button
			variant={placement === 'detail' ? 'outline' : 'ghost'}
			size={labelled ? (placement === 'detail' ? 'lg' : 'sm') : 'icon-lg'}
			className={
				placement === 'detail'
					? 'bg-card'
					: // Positioned so it sits above the card's stretched link; negative margins keep the footer row's height.
						'relative -my-2.5 -mr-2.5 text-muted-foreground hover:text-primary'
			}
			onClick={onClick}
			disabled={!content}
			aria-label={spoken}
			title={spoken}
		>
			<Icon data-icon="inline-start" className={status === 'busy' ? 'size-5 animate-spin' : 'size-5'} />
			{labelled && t.share.retap}
		</Button>
	);
}
