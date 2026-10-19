import { describe, expect, it } from 'vitest';
import { formatAgo, formatConcentration, formatDataTime, formatHour } from './format';

const ISO = '2026-10-18T09:00:00Z';

describe('locale-aware formatting', () => {
	it('uses each language’s separators and clock', () => {
		expect(formatHour(ISO, 'Asia/Jakarta', 'id')).toBe('16.00');
		expect(formatHour(ISO, 'Asia/Jakarta', 'en')).toBe('16:00');
		expect(formatConcentration(2.5, 'id')).toBe('2,5');
		expect(formatConcentration(2.5, 'en')).toBe('2.5');
	});

	it('keeps the Indonesian zone abbreviation in English', () => {
		expect(formatDataTime(ISO, 'Asia/Jakarta', 'id')).toMatch(/^18 Okt 2026.*16\.00 WIB$/);
		expect(formatDataTime(ISO, 'Asia/Jakarta', 'en')).toMatch(/^18 Oct 2026.*16:00 WIB$/);
		expect(formatDataTime(ISO, 'Asia/Makassar', 'en')).toMatch(/17:00 WITA$/);
	});

	it('words relative time per language', () => {
		const now = Date.parse(ISO);
		expect(formatAgo(ISO, 'en', now)).toBe('just now');
		expect(formatAgo(ISO, 'id', now)).toBe('baru saja');
		expect(formatAgo(ISO, 'en', now + 3 * 3_600_000)).toBe('3 hours ago');
	});
});
