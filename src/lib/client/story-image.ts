import { getImageProps } from 'next/image';
import { aqiBand, UAQI_STOPS, type AqiBandKey } from '@/lib/aqi';

/** Everything the story shows, already worded in the page language. */
export interface StoryContent {
	date: string;
	name: string;
	place: string;
	aqi: number;
	aqiDisplay: string;
	category: string;
	/** Google's category color, tinted behind the badge; null falls back to the band fill. */
	color: string | null;
	ispu: { label: string; category: string; color: string } | null;
	headline: string;
	pollutants: { label: string; value: string; unit: string }[];
	/** Current hour first, then the forecast; `ticks` index into `values`. */
	forecast: { title: string; values: number[]; ticks: { index: number; label: string }[] } | null;
	sources: string[];
}

// An Instagram story is 1080 x 1920. Instagram's own bar and reply field cover roughly the top 250px and the
// bottom 340px, so every reading stays between them; only the photo and the brand sit in the covered bands.
const W = 1080;
const H = 1920;
const SAFE_TOP = 250;
const X = 64;
const CARD_PAD = 48;
const INNER_X = X + CARD_PAD;
const INNER_W = W - 2 * INNER_X;
const BRAND_TOP = 1624;
const DOMAIN = 'niskalasense.com';
const GOOGLE_ATTRIBUTION = 'Google Maps · Source: Includes air quality data from Google';

// Tokens from globals.css; canvas cannot read CSS custom properties as colors.
const FOREGROUND = '#141920';
const MUTED = '#4a5360';
const BORDER = '#dbe0e8';
const BACKGROUND = '#f8fafd';
const SKY = '#d8e8fe';
const PRIMARY = '#13386b';

/** Lucide's face glyphs (24-unit grid), the same icons AqiBadge shows per band. */
const CIRCLE = 'M22 12a10 10 0 1 1-20 0a10 10 0 1 1 20 0';
const EYES = 'M9 9h.01M15 9h.01';
const FACES: Record<AqiBandKey, string[]> = {
	poor: [CIRCLE, 'M16 16s-1.5-2-4-2-4 2-4 2', 'M7.5 8 10 9', 'm14 9 2.5-1', 'M9 10h.01M15 10h.01'],
	low: [CIRCLE, 'M16 16s-1.5-2-4-2-4 2-4 2', EYES],
	moderate: [CIRCLE, 'M8 15h8', EYES],
	good: [CIRCLE, 'M8 14s1.5 2 4 2 4-2 4-2', EYES],
	excellent: [CIRCLE, 'M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z', EYES]
};
const PIN = ['M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0', 'M15 10a3 3 0 1 1-6 0a3 3 0 1 1 6 0'];

type Ctx = CanvasRenderingContext2D;

/** "rgb(r g b)" from the API or a hex token, as channels. */
function channels(color: string): [number, number, number] {
	if (color.startsWith('#')) return [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16)) as [number, number, number];
	const [r = 0, g = 0, b = 0] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
	return [r, g, b];
}

const rgb = ([r, g, b]: [number, number, number], alpha = 1) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;

/** The badge tint: `amount` of the color over white, close to tint() in aqi.ts. */
function tint(color: string, amount: number): string {
	return rgb(channels(color).map((c) => c * amount + 255 * (1 - amount)) as [number, number, number]);
}

function loadImage(src: string): Promise<HTMLImageElement> {
	const image = new Image();
	image.src = src;
	return image.decode().then(() => image);
}

/** Next's optimized URLs: a WebP of the hero instead of the 2 MB PNG. */
function assetUrls() {
	const photo = getImageProps({ src: '/images/headers/bumi-dan-atmosfer.png', alt: '', width: 2172, height: 724 }).props.src;
	const mark = getImageProps({ src: '/images/brand/niskala-udara-atmosfer.png', alt: '', width: 92, height: 92 }).props.src;
	return { photo, mark };
}

/** next/font names its families per build, so they are read from the variables the layout sets. */
async function loadFonts() {
	const style = getComputedStyle(document.documentElement);
	const sans = style.getPropertyValue('--font-plus-jakarta').trim() || 'sans-serif';
	const display = style.getPropertyValue('--font-gambetta').trim() || 'serif';
	await Promise.all([...[400, 500, 600, 700].map((weight) => document.fonts.load(`${weight} 40px ${sans}`)), document.fonts.load(`400 40px ${display}`)]);
	return { sans, display };
}

type Fonts = Awaited<ReturnType<typeof loadFonts>>;

function font(ctx: Ctx, weight: number, size: number, family: string) {
	ctx.font = `${weight} ${size}px ${family}`;
}

/** Text vertically centered in a CSS-like line box starting at `top`. */
function line(ctx: Ctx, text: string, x: number, top: number, lineHeight: number, color: string, align: CanvasTextAlign = 'left') {
	ctx.fillStyle = color;
	ctx.textAlign = align;
	ctx.textBaseline = 'middle';
	ctx.fillText(text, x, top + lineHeight / 2);
}

function ellipsize(ctx: Ctx, text: string, width: number): string {
	if (ctx.measureText(text).width <= width) return text;
	let cut = text;
	while (cut && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
	return `${cut.trimEnd()}…`;
}

function wrap(ctx: Ctx, text: string, width: number, maxLines: number): string[] {
	const lines: string[] = [];
	let current = '';
	for (const word of text.split(' ')) {
		const next = current ? `${current} ${word}` : word;
		if (current && ctx.measureText(next).width > width) {
			lines.push(current);
			current = word;
		} else current = next;
	}
	if (current) lines.push(current);
	if (lines.length <= maxLines) return lines;
	return [...lines.slice(0, maxLines - 1), ellipsize(ctx, lines.slice(maxLines - 1).join(' '), width)];
}

function icon(ctx: Ctx, paths: string[], x: number, y: number, size: number, color: string) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(size / 24, size / 24);
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	for (const path of paths) ctx.stroke(new Path2D(path));
	ctx.restore();
}

function drawPhoto(ctx: Ctx, photo: HTMLImageElement) {
	const height = 900;
	const layer = document.createElement('canvas');
	layer.width = W;
	layer.height = height;
	const l = layer.getContext('2d')!;
	// object-fit: cover at 62% across, as the mockup crops toward the islands.
	const scale = Math.max(W / photo.naturalWidth, height / photo.naturalHeight);
	const dw = photo.naturalWidth * scale;
	const dh = photo.naturalHeight * scale;
	l.drawImage(photo, (W - dw) * 0.62, (height - dh) / 2, dw, dh);
	l.globalCompositeOperation = 'destination-in';
	const fade = l.createLinearGradient(0, 0, 0, height);
	fade.addColorStop(0.5, 'rgba(0, 0, 0, 1)');
	fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
	l.fillStyle = fade;
	l.fillRect(0, 0, W, height);
	ctx.drawImage(layer, 0, 0);
}

/** AqiGauge's 270° ring, open at the bottom, with its knob and number. */
function drawGauge(ctx: Ctx, fonts: Fonts, content: StoryContent, x: number, y: number, size: number) {
	const ring = 30;
	const cx = x + size / 2;
	const cy = y + size / 2;
	const r = size / 2 - ring / 2;
	const start = (135 * Math.PI) / 180;
	const sweep = (270 * Math.PI) / 180;

	const conic = ctx.createConicGradient(start, cx, cy);
	for (const [at, color] of UAQI_STOPS) conic.addColorStop(((at / 100) * 270) / 360, rgb(channels(color)));
	ctx.beginPath();
	ctx.arc(cx, cy, r, start, start + sweep);
	ctx.strokeStyle = conic;
	ctx.lineWidth = ring;
	ctx.lineCap = 'butt';
	ctx.stroke();
	// Round caps in the end colors; a round lineCap would take the gradient's wrap-around color at the start.
	for (const [angle, color] of [
		[start, UAQI_STOPS[0][1]],
		[start + sweep, UAQI_STOPS.at(-1)![1]]
	] as const) {
		ctx.beginPath();
		ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), ring / 2, 0, Math.PI * 2);
		ctx.fillStyle = rgb(channels(color));
		ctx.fill();
	}

	const angle = start + (Math.min(100, Math.max(0, content.aqi)) / 100) * sweep;
	const kx = cx + r * Math.cos(angle);
	const ky = cy + r * Math.sin(angle);
	ctx.save();
	ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
	ctx.shadowBlur = 12;
	ctx.shadowOffsetY = 4;
	ctx.beginPath();
	ctx.arc(kx, ky, 26, 0, Math.PI * 2);
	ctx.fillStyle = '#ffffff';
	ctx.fill();
	ctx.restore();
	ctx.beginPath();
	ctx.arc(kx, ky, 17, 0, Math.PI * 2);
	ctx.fillStyle = FOREGROUND;
	ctx.fill();

	// The number and "AQI" centered as one block by their drawn heights, not their line boxes.
	ctx.textAlign = 'center';
	ctx.textBaseline = 'alphabetic';
	font(ctx, 700, 116, fonts.sans);
	const numberHeight = ctx.measureText(content.aqiDisplay).actualBoundingBoxAscent;
	font(ctx, 600, 30, fonts.sans);
	const unitHeight = ctx.measureText('AQI').actualBoundingBoxAscent;
	const top = cy - (numberHeight + 18 + unitHeight) / 2;
	font(ctx, 700, 116, fonts.sans);
	ctx.fillStyle = FOREGROUND;
	ctx.fillText(content.aqiDisplay, cx, top + numberHeight);
	font(ctx, 600, 30, fonts.sans);
	ctx.fillStyle = MUTED;
	ctx.fillText('AQI', cx, top + numberHeight + 18 + unitHeight);
}

const PILL_H = 68;

function drawBadge(ctx: Ctx, fonts: Fonts, content: StoryContent, x: number, y: number, maxWidth: number) {
	const band = aqiBand(content.aqi);
	font(ctx, 600, 32, fonts.sans);
	const text = ellipsize(ctx, content.category, maxWidth - 92);
	ctx.beginPath();
	ctx.roundRect(x, y, 92 + ctx.measureText(text).width, PILL_H, PILL_H / 2);
	ctx.fillStyle = tint(content.color ?? band.fill, 0.22);
	ctx.fill();
	icon(ctx, FACES[band.key], x + 16, y + 14, 40, band.ink);
	line(ctx, text, x + 68, y, PILL_H, FOREGROUND);
}

function drawIspu(ctx: Ctx, fonts: Fonts, ispu: NonNullable<StoryContent['ispu']>, x: number, y: number, maxWidth: number) {
	font(ctx, 600, 32, fonts.sans);
	const label = ispu.label;
	const labelWidth = ctx.measureText(label).width;
	font(ctx, 400, 32, fonts.sans);
	const category = ellipsize(ctx, ` · ${ispu.category}`, maxWidth - 84 - labelWidth);
	const width = 84 + labelWidth + ctx.measureText(category).width;
	ctx.beginPath();
	ctx.roundRect(x + 1, y + 1, width - 2, PILL_H - 2, PILL_H / 2);
	ctx.fillStyle = '#ffffff';
	ctx.fill();
	ctx.strokeStyle = BORDER;
	ctx.lineWidth = 2;
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(x + 36, y + PILL_H / 2, 12, 0, Math.PI * 2);
	ctx.fillStyle = ispu.color;
	ctx.fill();
	font(ctx, 600, 32, fonts.sans);
	line(ctx, label, x + 60, y, PILL_H, FOREGROUND);
	font(ctx, 400, 32, fonts.sans);
	line(ctx, category, x + 60 + labelWidth, y, PILL_H, MUTED);
}

const TILES_H = 176;

function drawTiles(ctx: Ctx, fonts: Fonts, pollutants: StoryContent['pollutants'], y: number) {
	const cell = INNER_W / pollutants.length;
	ctx.beginPath();
	ctx.roundRect(INNER_X + 1, y + 1, INNER_W - 2, TILES_H - 2, 32);
	ctx.strokeStyle = BORDER;
	ctx.lineWidth = 2;
	ctx.stroke();
	pollutants.forEach((p, i) => {
		const x = INNER_X + i * cell;
		if (i > 0) {
			ctx.fillStyle = BORDER;
			ctx.fillRect(x - 1, y, 2, TILES_H);
		}
		font(ctx, 600, 28, fonts.sans);
		line(ctx, p.label, x + 26, y + 18, 42, MUTED);
		font(ctx, 700, 46, fonts.sans);
		line(ctx, ellipsize(ctx, p.value, cell - 52), x + 26, y + 64, 55, FOREGROUND);
		font(ctx, 400, 26, fonts.sans);
		line(ctx, p.unit, x + 26, y + 119, 39, MUTED);
	});
}

const SPARK_H = 110;

function drawForecast(ctx: Ctx, fonts: Fonts, forecast: NonNullable<StoryContent['forecast']>, y: number, ink: string) {
	font(ctx, 600, 34, fonts.sans);
	line(ctx, forecast.title, INNER_X, y, 51, FOREGROUND);
	const top = y + 51;
	const { values } = forecast;
	const lo = Math.min(...values) - 8;
	const hi = Math.max(...values) + 8;
	const xAt = (i: number) => INNER_X + 12 + (i / (values.length - 1)) * (INNER_W - 24);
	const points = values.map((v, i) => [xAt(i), top + SPARK_H - 12 - ((v - lo) / (hi - lo)) * (SPARK_H - 24)] as const);

	// Dotted area under the line, like the dashboard card's forecast.
	const dot = document.createElement('canvas');
	dot.width = 14;
	dot.height = 14;
	const d = dot.getContext('2d')!;
	d.beginPath();
	d.arc(3, 3, 2.6, 0, Math.PI * 2);
	d.fillStyle = tint(ink, 0.3);
	d.fill();
	ctx.beginPath();
	ctx.moveTo(points[0][0], top + SPARK_H);
	for (const [px, py] of points) ctx.lineTo(px, py);
	ctx.lineTo(points.at(-1)![0], top + SPARK_H);
	ctx.closePath();
	ctx.fillStyle = ctx.createPattern(dot, 'repeat')!;
	ctx.fill();

	ctx.beginPath();
	points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
	ctx.strokeStyle = ink;
	ctx.lineWidth = 7;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(points[0][0], points[0][1], 13, 0, Math.PI * 2);
	ctx.fillStyle = ink;
	ctx.fill();
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 5;
	ctx.stroke();

	// Ticks sit under their hours; the outer two lean inward so they stay inside the card.
	font(ctx, 400, 26, fonts.sans);
	forecast.ticks.forEach(({ index, label }, i) => {
		const align = i === 0 ? 'left' : i === forecast.ticks.length - 1 ? 'right' : 'center';
		const x = i === 0 ? INNER_X : i === forecast.ticks.length - 1 ? INNER_X + INNER_W : xAt(index);
		line(ctx, label, x, top + SPARK_H + 4, 39, MUTED, align);
	});
	return 51 + SPARK_H + 4 + 39;
}

function draw(ctx: Ctx, fonts: Fonts, content: StoryContent, photo: HTMLImageElement, mark: HTMLImageElement) {
	const background = ctx.createLinearGradient(0, 0, 0, H);
	background.addColorStop(0, BACKGROUND);
	background.addColorStop(0.72, BACKGROUND);
	background.addColorStop(1, SKY);
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, W, H);
	drawPhoto(ctx, photo);

	const width = W - 2 * X;
	let y = SAFE_TOP;
	font(ctx, 500, 34, fonts.sans);
	line(ctx, ellipsize(ctx, content.date, width), X, y, 51, MUTED);
	y += 51 + 16;

	// The name shrinks before it truncates, so a long kabupaten name still reads whole.
	let size = 128;
	font(ctx, 400, size, fonts.display);
	while (size > 80 && ctx.measureText(content.name).width > width) font(ctx, 400, (size -= 4), fonts.display);
	line(ctx, ellipsize(ctx, content.name, width), X, y, 134, FOREGROUND);
	y += 134 + 12;

	icon(ctx, PIN, X, y + 9, 36, MUTED);
	font(ctx, 400, 36, fonts.sans);
	line(ctx, ellipsize(ctx, content.place, width - 48), X + 48, y, 54, MUTED);
	y += 54 + 36;

	// Lay the card out first, so its background can be drawn before what sits on it.
	const colX = INNER_X + 300 + 40;
	const colW = INNER_W - 340;
	font(ctx, 600, 48, fonts.sans);
	const headline = wrap(ctx, content.headline, colW, 3);
	const colH = PILL_H + (content.ispu ? 16 + PILL_H : 0) + 16 + headline.length * 59;
	const rowH = Math.max(300, colH);
	font(ctx, 400, 26, fonts.sans);
	// Two lines per source keeps the card above the brand even with a three-line headline.
	const sources = content.sources.flatMap((source) => wrap(ctx, source, INNER_W, 2));
	const gap = 28;
	const forecastH = content.forecast ? 51 + SPARK_H + 4 + 39 + gap : 0;
	const cardH = CARD_PAD + rowH + gap + TILES_H + gap + forecastH + 2 + 28 + sources.length * 38 + CARD_PAD;

	ctx.save();
	ctx.shadowColor = 'rgba(20, 25, 32, 0.06)';
	ctx.shadowBlur = 40;
	ctx.shadowOffsetY = 12;
	ctx.beginPath();
	ctx.roundRect(X + 1, y + 1, width - 2, cardH - 2, 56);
	ctx.fillStyle = '#ffffff';
	ctx.fill();
	ctx.restore();
	ctx.strokeStyle = BORDER;
	ctx.lineWidth = 2;
	ctx.stroke();

	let cy = y + CARD_PAD;
	drawGauge(ctx, fonts, content, INNER_X, cy + (rowH - 300) / 2, 300);
	let colY = cy + (rowH - colH) / 2;
	drawBadge(ctx, fonts, content, colX, colY, colW);
	colY += PILL_H + 16;
	if (content.ispu) {
		drawIspu(ctx, fonts, content.ispu, colX, colY, colW);
		colY += PILL_H + 16;
	}
	font(ctx, 600, 48, fonts.sans);
	headline.forEach((text, i) => line(ctx, text, colX, colY + i * 59, 59, FOREGROUND));
	cy += rowH + gap;

	drawTiles(ctx, fonts, content.pollutants, cy);
	cy += TILES_H + gap;

	if (content.forecast) cy += drawForecast(ctx, fonts, content.forecast, cy, aqiBand(content.aqi).ink) + gap;

	ctx.fillStyle = BORDER;
	ctx.fillRect(INNER_X, cy, INNER_W, 2);
	cy += 2 + 28;
	font(ctx, 400, 26, fonts.sans);
	sources.forEach((text, i) => line(ctx, text, INNER_X, cy + i * 38, 38, MUTED));

	// Brand in the bottom band: decorative, so a reply field over part of it on a short screen costs nothing.
	ctx.drawImage(mark, X, BRAND_TOP + 13, 92, 92);
	font(ctx, 400, 60, fonts.display);
	line(ctx, 'Niskala', X + 114, BRAND_TOP, 60, FOREGROUND);
	font(ctx, 600, 34, fonts.sans);
	line(ctx, DOMAIN, X + 114, BRAND_TOP + 68, 51, PRIMARY);
}

/** Draws the story and returns it as a PNG file ready for the share sheet or a download. */
export async function renderStory(content: StoryContent, fileName: string): Promise<File> {
	const urls = assetUrls();
	const [fonts, photo, mark] = await Promise.all([loadFonts(), loadImage(urls.photo), loadImage(urls.mark)]);
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	draw(canvas.getContext('2d')!, fonts, { ...content, sources: [GOOGLE_ATTRIBUTION, ...content.sources] }, photo, mark);
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	if (!blob) throw new Error('canvas_export_failed');
	return new File([blob], fileName, { type: 'image/png' });
}
