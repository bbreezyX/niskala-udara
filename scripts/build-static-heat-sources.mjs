// Builds src/lib/server/static-heat-sources.json: places where satellites see heat that is not a fire.
//
// NASA FIRMS's live (NRT) data cannot tell a fire from a gas flare, a smelter or a volcano. Its standard
// processing (SP), a few months behind, can: the `type` field marks volcanoes (1), static land sources such
// as smelters and refineries (2) and offshore sources (3). This script collects those detections over the
// last 12 months of SP data for both VIIRS satellites, merges them into ~550 m cells, and keeps cells seen
// at least twice, so one mislabelled detection cannot mask a real fire. Rerun it every six months or so.
//
// Usage: node --env-file=.env scripts/build-static-heat-sources.mjs [last-day YYYY-MM-DD]

import { writeFileSync } from 'node:fs';

const KEY = process.env.FIRMS_MAP_KEY;
if (!KEY) throw new Error('FIRMS_MAP_KEY is not set (run with --env-file=.env)');

const HOST = 'https://firms.modaps.eosdis.nasa.gov';
/** MAP_BOUNDS in src/lib/config/map.ts: all of Indonesia. */
const AREA = '94.5,-11.5,141.5,6.5';
const SOURCES = ['VIIRS_SNPP_SP', 'VIIRS_NOAA20_SP'];
/** The area API's largest day range. */
const WINDOW_DAYS = 5;
const CELL_DEGREES = 0.005;
const MIN_SEEN = 2;
const OUTPUT = new URL('../src/lib/server/static-heat-sources.json', import.meta.url);
const DAY_MS = 86_400_000;

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

async function get(url) {
	for (let attempt = 1; ; attempt++) {
		try {
			const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
			const text = await response.text();
			if (response.ok && !/^Invalid|error/i.test(text)) return text;
			throw new Error(`HTTP ${response.status}: ${text.slice(0, 80)}`);
		} catch (error) {
			if (attempt >= 3) throw error;
			process.stderr.write(`  retry ${attempt}: ${error.message}\n`);
			await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
		}
	}
}

/** The last day every SP source covers, unless one is given. */
async function lastDay() {
	if (process.argv[2]) return Date.parse(`${process.argv[2]}T00:00:00Z`);
	const csv = await get(`${HOST}/api/data_availability/csv/${KEY}/ALL`);
	const ends = csv
		.trim()
		.split(/\r?\n/)
		.map((line) => line.split(','))
		.filter(([source]) => SOURCES.includes(source))
		.map(([, , end]) => Date.parse(`${end}T00:00:00Z`));
	if (ends.length !== SOURCES.length) throw new Error('SP availability not found');
	return Math.min(...ends);
}

const end = await lastDay();
const start = end - 364 * DAY_MS;
const cells = new Map();
let total = 0;

for (const source of SOURCES) {
	for (let from = start; from <= end; from += WINDOW_DAYS * DAY_MS) {
		const days = Math.min(WINDOW_DAYS, Math.round((end - from) / DAY_MS) + 1);
		const csv = await get(`${HOST}/api/area/csv/${KEY}/${source}/${AREA}/${days}/${isoDay(from)}`);
		const [header, ...rows] = csv.trim().split(/\r?\n/);
		const columns = header.split(',');
		const [lat, lon, type] = ['latitude', 'longitude', 'type'].map((name) => columns.indexOf(name));
		if (lat < 0 || lon < 0 || type < 0) throw new Error(`${source} ${isoDay(from)}: unexpected header ${header}`);
		let kept = 0;
		for (const row of rows) {
			const cellsOfRow = row.split(',');
			if (!['1', '2', '3'].includes(cellsOfRow[type])) continue;
			const latitude = Number(cellsOfRow[lat]);
			const longitude = Number(cellsOfRow[lon]);
			if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
			const key = `${Math.floor(latitude / CELL_DEGREES)}:${Math.floor(longitude / CELL_DEGREES)}`;
			const cell = cells.get(key) ?? { seen: 0, latitude: 0, longitude: 0 };
			cell.seen += 1;
			cell.latitude += latitude;
			cell.longitude += longitude;
			cells.set(key, cell);
			kept += 1;
		}
		total += kept;
		process.stderr.write(`${source} ${isoDay(from)} +${days}d: ${rows.length} rows, ${kept} static\n`);
	}
}

const points = [...cells.values()]
	.filter((cell) => cell.seen >= MIN_SEEN)
	.map((cell) => [Number((cell.latitude / cell.seen).toFixed(4)), Number((cell.longitude / cell.seen).toFixed(4))])
	.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

const data = {
	source: 'NASA FIRMS VIIRS standard processing (S-NPP, NOAA-20), type 1 volcano, 2 static land source, 3 offshore',
	from: isoDay(start),
	to: isoDay(end),
	cellDegrees: CELL_DEGREES,
	minSeen: MIN_SEEN,
	points
};
writeFileSync(OUTPUT, `${JSON.stringify(data)}\n`);
process.stderr.write(`${total} static detections, ${cells.size} cells, ${points.length} kept (seen ≥ ${MIN_SEEN})\n`);
