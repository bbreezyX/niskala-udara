import { describe, expect, it } from 'vitest';
import { dailyPattern, dayRows, HOUR_MS, hourSlots, partOfDay, summarize } from './history';
import type { AirQualityData } from './types';

function reading(iso: string, aqi: number, dominantPollutant: string | null = 'pm25', color: string | null = null): AirQualityData {
	return {
		dataTime: iso,
		index: { displayName: 'Universal AQI', aqi, aqiDisplay: String(aqi), category: null, dominantPollutant, color },
		pollutants: [],
		recommendations: {}
	};
}

/** UTC hours on 20 Oct 2026; values past 23 roll into the next days. WIB is UTC+7. */
const at = (h: number) => new Date(Date.UTC(2026, 9, 20, h)).toISOString();

/** `count` hourly readings from UTC hour `start`, valued by their WIB hour of day. */
function series(start: number, count: number, aqiAt: (wibHour: number) => number) {
	return Array.from({ length: count }, (_, i) => reading(at(start + i), aqiAt((start + i + 7) % 24)));
}

const peaks = (h: number) => (h === 17 || h === 18 ? 40 : h === 3 || h === 4 ? 2 : 20);

describe('hourSlots', () => {
	it('lists every hour of the range ending at the newest reading, gaps as null', () => {
		const slots = hourSlots([reading(at(0), 10), reading(at(1), 12), reading(at(3), 14)], 24);
		expect(slots).toHaveLength(24);
		expect(slots[0].t).toBe(Date.parse(at(3)) - 23 * HOUR_MS);
		expect(slots.at(-1)!.hour?.index.aqi).toBe(14);
		expect(slots.at(-2)!.hour).toBeNull();
		expect(slots.filter((slot) => slot.hour).length).toBe(3);
	});

	it('returns nothing for no readings', () => {
		expect(hourSlots([], 24)).toEqual([]);
	});
});

describe('summarize', () => {
	it('averages, counts bands worst first and names the most frequent band', () => {
		const summary = summarize([reading(at(0), 10), reading(at(1), 15), reading(at(2), 25), reading(at(3), 62, 'o3')]);
		expect(summary.mean).toBe(28);
		expect(summary.bands).toEqual([
			{ key: 'poor', count: 2 },
			{ key: 'low', count: 1 },
			{ key: 'good', count: 1 }
		]);
		expect(summary.top).toBe('poor');
		expect(summary.dominant).toEqual([
			{ code: 'pm25', count: 3 },
			{ code: 'o3', count: 1 }
		]);
	});

	it('takes the latest hour when the worst or best value repeats', () => {
		const summary = summarize([reading(at(0), 5), reading(at(1), 30), reading(at(2), 5), reading(at(3), 30)]);
		expect(summary.worst.dataTime).toBe(at(2));
		expect(summary.best.dataTime).toBe(at(3));
	});

	it('gives a tied band count to the worse band', () => {
		expect(summarize([reading(at(0), 10), reading(at(1), 70)]).top).toBe('poor');
	});

	it('skips hours without a dominant pollutant', () => {
		expect(summarize([reading(at(0), 10, null), reading(at(1), 12)]).dominant).toEqual([{ code: 'pm25', count: 1 }]);
	});
});

describe('dailyPattern', () => {
	it('finds the cleanest and most polluted two-hour windows in the city zone', () => {
		expect(dailyPattern(series(0, 48, peaks), 'Asia/Jakarta')).toEqual({
			best: { startHour: 17, avg: 40 },
			worst: { startHour: 3, avg: 2 }
		});
	});

	it('reads hours in the city’s own zone', () => {
		expect(dailyPattern(series(0, 48, peaks), 'Asia/Makassar')).toEqual({
			best: { startHour: 18, avg: 40 },
			worst: { startHour: 4, avg: 2 }
		});
	});

	it('lets a window cross midnight', () => {
		const hours = series(0, 24, (h) => (h === 23 || h === 0 ? 1 : 30));
		expect(dailyPattern(hours, 'Asia/Jakarta')?.worst).toEqual({ startHour: 23, avg: 1 });
	});

	it('claims no pattern when windows differ by less than 5 points', () => {
		expect(dailyPattern(series(0, 24, (h) => 60 + (h % 3)), 'Asia/Jakarta')).toBeNull();
	});

	it('claims no pattern without two adjacent hours', () => {
		expect(dailyPattern([reading(at(0), 10)], 'Asia/Jakarta')).toBeNull();
	});
});

describe('partOfDay', () => {
	it('names the part of day a window starts in', () => {
		expect([0, 4, 5, 10, 11, 14, 15, 17, 18, 23].map(partOfDay)).toEqual([
			'night',
			'night',
			'morning',
			'morning',
			'midday',
			'midday',
			'afternoon',
			'afternoon',
			'evening',
			'evening'
		]);
	});
});

describe('dayRows', () => {
	it('splits the range into calendar days of 24 cells in the city zone', () => {
		// 22.00 WIB on 20 Oct to 02.00 WIB on 21 Oct, with 00.00 missing.
		const hours = [reading(at(15), 10, 'pm25', 'rgb(255 0 0)'), reading(at(16), 12), reading(at(18), 14), reading(at(19), 16)];
		const rows = dayRows(hourSlots(hours, 5), 'Asia/Jakarta');
		expect(rows.map((row) => row.key)).toEqual(['2026-10-20', '2026-10-21']);
		expect(rows[0].cells).toHaveLength(24);
		expect(rows[0].cells[21]).toBe('outside');
		expect(rows[0].cells[22]).toEqual({ aqi: 10, color: 'rgb(255 0 0)' });
		expect(rows[1].cells[0]).toBe('gap');
		expect(rows[1].cells[1]).toEqual({ aqi: 14, color: '#c5221f' });
		expect(rows[1].cells[3]).toBe('outside');
		expect(rows.map((row) => row.avg)).toEqual([11, 15]);
	});

	it('gives a day that holds only gaps no average', () => {
		// The range opens at 23.00 WIB on 20 Oct, but the first reading is 01.00 WIB on 21 Oct.
		const rows = dayRows(hourSlots([reading(at(18), 14)], 3), 'Asia/Jakarta');
		expect(rows[0].cells[23]).toBe('gap');
		expect(rows[0].avg).toBeNull();
	});
});
