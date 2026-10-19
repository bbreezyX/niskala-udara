import { describe, expect, it } from 'vitest';
import { fill, localizePath, splitLocale } from './config';

describe('splitLocale', () => {
	it('reads an explicit prefix', () => {
		expect(splitLocale('/en')).toEqual({ prefix: 'en', path: '/' });
		expect(splitLocale('/en/location/jambi')).toEqual({ prefix: 'en', path: '/location/jambi' });
		expect(splitLocale('/id/map')).toEqual({ prefix: 'id', path: '/map' });
	});

	it('leaves bare and look-alike paths alone', () => {
		expect(splitLocale('/')).toEqual({ prefix: null, path: '/' });
		expect(splitLocale('/map')).toEqual({ prefix: null, path: '/map' });
		expect(splitLocale('/english')).toEqual({ prefix: null, path: '/english' });
	});
});

describe('localizePath', () => {
	it('prefixes internal paths for English', () => {
		expect(localizePath('/', 'en')).toBe('/en');
		expect(localizePath('/?region=jawa', 'en')).toBe('/en?region=jawa');
		expect(localizePath('/map', 'en')).toBe('/en/map');
		expect(localizePath('/location/point#-1.6,103.6', 'en')).toBe('/en/location/point#-1.6,103.6');
	});

	it('keeps Indonesian bare and drops an existing prefix', () => {
		expect(localizePath('/map', 'id')).toBe('/map');
		expect(localizePath('/en/map', 'id')).toBe('/map');
		expect(localizePath('/en', 'id')).toBe('/');
		expect(localizePath('/en/map', 'en')).toBe('/en/map');
	});

	it('passes external and fragment hrefs through', () => {
		expect(localizePath('https://firms.modaps.eosdis.nasa.gov/', 'en')).toBe('https://firms.modaps.eosdis.nasa.gov/');
		expect(localizePath('//cdn.example.com/x', 'en')).toBe('//cdn.example.com/x');
		expect(localizePath('#konten', 'en')).toBe('#konten');
	});
});

describe('fill', () => {
	it('replaces known placeholders and keeps unknown ones', () => {
		expect(fill('Ganti ke {name}', { name: 'English' })).toBe('Ganti ke English');
		expect(fill('{a} {b}', { a: 'x' })).toBe('x {b}');
	});
});
