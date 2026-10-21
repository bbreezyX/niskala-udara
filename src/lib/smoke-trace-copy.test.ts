import { describe, expect, it } from 'vitest';
import { en } from '@/lib/i18n/dictionaries/en';
import { id } from '@/lib/i18n/dictionaries/id';
import type { SmokeTrace } from '@/lib/types';
import { traceSentence, traceVariant } from './smoke-trace-copy';

const base: SmokeTrace = {
	hours: 12,
	startedAt: '2026-10-21T06:00:00.000Z',
	windFetchedAt: '2026-10-21T04:00:00.000Z',
	firesFetchedAt: '2026-10-21T05:50:00.000Z',
	missingFireSources: [],
	calm: false,
	truncated: false,
	from: 225,
	path: [],
	hotspots: [],
	count: 38,
	totalFrp: 420,
	level: 'heavy',
	mainGroup: { latitude: -3.4, longitude: 104.2, count: 20, totalFrp: 300, distanceKm: 80, bearing: 230, hoursBack: 5 }
};
const trace = (over: Partial<SmokeTrace> = {}): SmokeTrace => ({ ...base, ...over });
const smoky = { aqi: 35, dominantPollutant: 'pm25' };

describe('traceSentence', () => {
	it('says smoke is likely only for heavy fires, a moderate-or-worse reading and dominant PM2.5', () => {
		expect(traceSentence(trace(), smoky, id, 'id')).toBe(
			'Angin 12 jam terakhir datang dari barat daya dan melewati 38 titik api. Kelompok api terkuat ada sekitar 80 km dari sini. PM2.5 sedang tinggi, jadi asap kebakaran kemungkinan ikut menyumbang.'
		);
		expect(traceVariant(trace({ level: 'light' }), smoky)).toBe('fires');
		expect(traceVariant(trace(), { aqi: 35, dominantPollutant: 'o3' })).toBe('fires');
		expect(traceVariant(trace(), { aqi: 65, dominantPollutant: 'pm25' })).toBe('fires');
	});

	it('states fires and the reading side by side, band in lower case', () => {
		expect(traceSentence(trace({ level: 'light' }), smoky, id, 'id')).toBe(
			'Angin 12 jam terakhir datang dari barat daya dan melewati 38 titik api. Kelompok api terkuat ada sekitar 80 km dari sini. Kualitas udara di sini saat ini rendah.'
		);
	});

	it('has a no-fires sentence, calm sentences and a map version', () => {
		expect(traceSentence(trace({ count: 0, totalFrp: 0, level: 'none', mainGroup: null }), smoky, id, 'id')).toBe(
			'Angin 12 jam terakhir datang dari barat daya tanpa melewati titik api yang terdeteksi satelit.'
		);
		expect(traceSentence(trace({ calm: true, from: null, count: 4 }), smoky, id, 'id')).toBe(
			'Angin hampir tenang selama 12 jam terakhir. Ada 4 titik api dalam 50 km, dan asapnya bisa mengendap di sekitar sini.'
		);
		expect(traceSentence(trace(), null, id, 'id')).toBe(
			'Tengah peta: angin 12 jam terakhir datang dari barat daya dan melewati 38 titik api. Kelompok api terkuat ada sekitar 80 km dari tengah peta.'
		);
	});

	it('appends the truncation note and uses English plurals', () => {
		expect(traceSentence(trace({ truncated: true, level: 'light' }), smoky, id, 'id')).toMatch(
			/ Jejak berhenti di batas data angin, jadi api di luar Indonesia tidak terhitung\.$/
		);
		expect(traceSentence(trace({ count: 1, level: 'light' }), smoky, en, 'en')).toContain('1 hotspot.');
	});
});
