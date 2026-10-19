/** Names the band in the dictionaries (`ispu.bands`). */
export type IspuBandKey = 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy' | 'hazardous';

/**
 * KLH/BPLH's legend puts 300 itself at Berbahaya. Google's ISPU also stops at 300, so a Google 300 means
 * "300 or more" (Palangka Raya, 19 Oct 2026: Google 300, KLH station 1289).
 */
export const ISPU_HAZARDOUS_FROM = 300;

export interface IspuBand {
	key: IspuBandKey;
	color: string;
	/** Text on `color`: KLH puts white on every band, which fails contrast on its green and yellow. */
	onColor: string;
}

/** Upper bounds and colors from the KLH/BPLH ISPU site (ispu.kemenlh.go.id, custom-2026.css). */
export const ISPU_BANDS: readonly (IspuBand & { below: number })[] = [
	{ below: 51, key: 'good', color: '#00cc00', onColor: '#000000' },
	{ below: 101, key: 'moderate', color: '#0000cc', onColor: '#ffffff' },
	{ below: 201, key: 'unhealthy', color: '#cccc00', onColor: '#000000' },
	{ below: ISPU_HAZARDOUS_FROM, key: 'veryUnhealthy', color: '#cc0000', onColor: '#ffffff' },
	{ below: Infinity, key: 'hazardous', color: '#000000', onColor: '#ffffff' }
];

export function ispuBand(value: number): IspuBand {
	return ISPU_BANDS.find((band) => value < band.below) ?? ISPU_BANDS[ISPU_BANDS.length - 1];
}
