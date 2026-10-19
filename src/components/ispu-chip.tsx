'use client';

import { formatHour, timeZoneLabel } from '@/lib/format';
import { fill } from '@/lib/i18n/config';
import { ispuBand, ISPU_HAZARDOUS_FROM } from '@/lib/ispu';
import type { KlhkStation } from '@/lib/server/klhk-ispu';
import type { UniversalAqi } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDictionary, useLocale } from './locale-provider';

/** "Stasiun KLH/BPLH Jambi Paal Lima, 18.00 WIB": where a station reading comes from. */
export function useStationSource(station: KlhkStation, timeZone: string): string {
	const t = useDictionary();
	const locale = useLocale();
	const time = `${formatHour(station.observedAt, timeZone, locale)} ${timeZoneLabel(timeZone, new Date(station.observedAt))}`;
	return fill(t.ispu.sourceStation, { name: station.name, time });
}

// rounded-2xl is still a pill on one line and stays tidy when a long category wraps.
const CHIP = 'inline-flex max-w-full items-center gap-1.5 rounded-2xl border bg-card px-2.5 py-1 text-xs font-semibold text-foreground';

interface Props {
	/** From `useKlhkStation`: undefined while loading, null when the city has no current station reading. */
	station: KlhkStation | null | undefined;
	/** Google's model ISPU, shown only when no station reading exists. */
	google: UniversalAqi | undefined;
	timeZone: string;
	className?: string;
}

/**
 * ISPU beside the UAQI badge: the index Indonesian readers know from KLH/BPLH and the news. A KLH/BPLH station
 * reading comes first, with KLH's own bands and colors. Without one, Google's model value is shown as returned,
 * except from 300 up, where Google stops counting and KLH's legend says Berbahaya. Nothing shows while the
 * station is still loading, so the number never swaps under the reader.
 */
export function IspuChip({ station, google, timeZone, className }: Props) {
	// Holds the chip's exact size while loading, so the card below does not jump when it arrives.
	if (station === undefined) {
		return (
			<span aria-hidden="true" className={cn(CHIP, 'animate-pulse border-transparent bg-muted text-transparent', className)}>
				ISPU 000
			</span>
		);
	}
	if (station) return <StationChip station={station} timeZone={timeZone} className={className} />;
	if (google) return <GoogleChip ispu={google} className={className} />;
	return null;
}

function StationChip({ station, timeZone, className }: { station: KlhkStation; timeZone: string; className?: string }) {
	const { ispu: t } = useDictionary();
	const band = ispuBand(station.ispu);
	return (
		<Chip
			value={String(station.ispu)}
			category={t.bands[band.key]}
			color={band.color}
			title={useStationSource(station, timeZone)}
			className={className}
		/>
	);
}

function GoogleChip({ ispu, className }: { ispu: UniversalAqi; className?: string }) {
	const { ispu: t } = useDictionary();
	const hazardous = ispu.aqi >= ISPU_HAZARDOUS_FROM;
	return (
		<Chip
			value={hazardous ? fill(t.atLeast, { value: String(ISPU_HAZARDOUS_FROM) }) : ispu.aqiDisplay}
			category={hazardous ? t.bands.hazardous : ispu.category}
			color={hazardous ? ispuBand(ispu.aqi).color : ispu.color}
			title={t.sourceModel}
			className={className}
		/>
	);
}

function Chip({
	value,
	category,
	color,
	title,
	className
}: {
	value: string;
	category: string | null;
	color: string | null;
	title: string;
	className?: string;
}) {
	const { ispu: t } = useDictionary();
	return (
		<span className={cn(CHIP, className)} title={title}>
			<span className="sr-only">{fill(t.spoken, { value, category: category ?? '' })}</span>
			{color && <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />}
			{/* Wraps rather than truncates: the category is the part that carries the meaning. */}
			<span className="min-w-0 tabular-nums" aria-hidden="true">
				{t.label} {value}
				{category && <span className="font-normal text-muted-foreground"> · {category}</span>}
			</span>
		</span>
	);
}
