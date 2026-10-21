import { aqiBand, type AqiBandKey } from '@/lib/aqi';
import { numberFormat } from '@/lib/format';
import { fill, plural, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries/id';
import { CALM_RADIUS_KM } from '@/lib/smoke-trace';
import type { SmokeTrace } from '@/lib/types';

/** The place's current reading, as far as the sentence needs it. */
export interface TraceReading {
	aqi: number;
	dominantPollutant: string | null;
}

export type TraceVariant = 'smokeLikely' | 'fires' | 'none' | 'calmFires' | 'calmNone';

/** UAQI bands at Moderate or worse; traffic alone often reaches these, so they never suffice on their own. */
const SMOKY_BANDS: readonly AqiBandKey[] = ['moderate', 'low', 'poor'];

/** Index into the dictionary's eight compass words. */
export const compassPoint = (bearing: number) => Math.round(bearing / 45) % 8;

/**
 * "Smoke likely contributing" needs all three: heavy fires in the corridor, a Moderate-or-worse reading
 * and PM2.5 leading it. Otherwise the fires and the reading are stated side by side, with no conclusion.
 */
export function traceVariant(trace: SmokeTrace, reading: TraceReading | null): TraceVariant {
	if (trace.calm) return trace.count > 0 ? 'calmFires' : 'calmNone';
	if (trace.count === 0) return 'none';
	const smoky =
		reading !== null &&
		trace.level === 'heavy' &&
		reading.dominantPollutant === 'pm25' &&
		SMOKY_BANDS.includes(aqiBand(reading.aqi).key);
	return smoky ? 'smokeLikely' : 'fires';
}

/** The trace in one sentence. Without a reading it is the map-centre version, which draws no conclusion. */
export function traceSentence(trace: SmokeTrace, reading: TraceReading | null, t: Dictionary, locale: Locale): string {
	const copy = t.smokeTrace;
	const variant = traceVariant(trace, reading);
	const values = {
		hours: String(trace.hours),
		n: numberFormat(locale, 0).format(trace.count),
		direction: trace.from === null ? '' : t.map.compass[compassPoint(trace.from)],
		km: String(trace.calm ? CALM_RADIUS_KM : (trace.mainGroup?.distanceKm ?? 0)),
		band: reading ? t.aqi.bands[aqiBand(reading.aqi).key].toLocaleLowerCase(locale) : ''
	};
	const onMap = reading === null;
	const sentence = {
		smokeLikely: () => plural(copy.smokeLikely, trace.count, locale, values),
		fires: () => plural(onMap ? copy.mapFires : copy.fires, trace.count, locale, values),
		none: () => fill(onMap ? copy.mapNone : copy.none, values),
		calmFires: () => plural(onMap ? copy.mapCalmFires : copy.calmFires, trace.count, locale, values),
		calmNone: () => fill(onMap ? copy.mapCalmNone : copy.calmNone, values)
	}[variant]();
	return trace.truncated && !trace.calm ? `${sentence} ${copy.truncated}` : sentence;
}
