import type { PollutantCode, PollutantReading } from './types';

/**
 * WHO Global Air Quality Guidelines 2021, in µg/m³: 24-hour means, except O₃, which has no 24-hour
 * guideline, so its 8-hour value is used. The readings are hourly, so a ratio indicates how far the
 * air is from the guideline; it is not a formal exceedance.
 */
const GUIDELINE_UGM3: Record<PollutantCode, number> = {
	pm25: 15,
	pm10: 45,
	o3: 100,
	no2: 25,
	so2: 40,
	co: 4000
};

/** Molar mass in g/mol, for ppb → µg/m³ at 25 °C and 1 atm (molar volume 24.45 L). */
const MOLAR_MASS: Partial<Record<PollutantCode, number>> = { o3: 48.0, no2: 46.01, so2: 64.07, co: 28.01 };
const MOLAR_VOLUME = 24.45;

function toMicrogramsPerCubicMeter({ code, value, units }: PollutantReading): number | null {
	if (units === 'MICROGRAMS_PER_CUBIC_METER') return value;
	const mass = MOLAR_MASS[code];
	if (units === 'PARTS_PER_BILLION' && mass) return (value * mass) / MOLAR_VOLUME;
	return null;
}

/** How many times the WHO guideline a reading is (1 = at the guideline), or null if the unit is unknown. */
export function whoRatio(reading: PollutantReading): number | null {
	const concentration = toMicrogramsPerCubicMeter(reading);
	return concentration === null ? null : concentration / GUIDELINE_UGM3[reading.code];
}
