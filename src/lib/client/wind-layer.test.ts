import { describe, expect, it } from 'vitest';
import type { WindData } from '@/lib/types';
import { describeWind, WindField } from './wind-layer';

// 2 × 2 grid, 1° apart: u grows eastward, v grows northward.
const data: WindData = {
	grid: { west: 100, south: 0, step: 1, columns: 2, rows: 2 },
	u: [0, 4, 0, 4],
	v: [0, 0, 2, 2],
	validAt: '2026-10-19T05:00:00.000Z',
	fetchedAt: '2026-10-19T05:10:00.000Z'
};

describe('WindField', () => {
	const field = new WindField(data);

	it('interpolates bilinearly inside the grid, including its far edges', () => {
		expect(field.at(0.5, 100.5)).toEqual({ u: 2, v: 1 });
		expect(field.at(1, 101)).toEqual({ u: 4, v: 2 });
	});

	it('has no wind outside the grid', () => {
		expect(field.at(-0.1, 100.5)).toBeNull();
		expect(field.at(0.5, 101.1)).toBeNull();
	});
});

describe('describeWind', () => {
	it('gives speed and the bearing the wind blows toward', () => {
		expect(describeWind({ u: 0, v: 3 })).toEqual({ speed: 3, toward: 0 });
		expect(describeWind({ u: -3, v: 0 }).toward).toBe(270);
		expect(describeWind({ u: 3, v: -3 }).toward).toBeCloseTo(135);
	});
});
