/** Names the band in the dictionaries (`ispu.bands`). */
export type IspuBandKey = 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy' | 'hazardous';

/**
 * KLH/BPLH's legend puts 300 itself at Berbahaya. Google's ISPU also stops at 300, so a Google 300 means
 * "300 or more" (Palangka Raya, 19 Oct 2026: Google 300, KLH station 1289).
 */
export const ISPU_HAZARDOUS_FROM = 300;

/** Upper bounds and colors from the KLH/BPLH ISPU site (ispu.kemenlh.go.id, custom-2026.css). */
const BANDS: readonly { below: number; key: IspuBandKey; color: string }[] = [
	{ below: 51, key: 'good', color: '#00cc00' },
	{ below: 101, key: 'moderate', color: '#0000cc' },
	{ below: 201, key: 'unhealthy', color: '#cccc00' },
	{ below: ISPU_HAZARDOUS_FROM, key: 'veryUnhealthy', color: '#cc0000' },
	{ below: Infinity, key: 'hazardous', color: '#000000' }
];

export function ispuBand(value: number): { key: IspuBandKey; color: string } {
	return BANDS.find((band) => value < band.below) ?? BANDS[BANDS.length - 1];
}
