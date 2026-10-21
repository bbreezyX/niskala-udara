'use client';

import { Suspense, useId, useMemo } from 'react';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { useRecharts } from '@/lib/client/recharts';
import { dateTimeFormat } from '@/lib/date-format';
import { formatHour } from '@/lib/format';
import { fill } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { useDictionary, useLocale } from './locale-provider';

export interface TrendPoint {
	dateTime: string;
	aqi: number;
	/** Forecast points render dashed, after the "Sekarang" marker. */
	forecast?: boolean;
}

interface Row {
	t: number;
	aqi: number;
	forecast: boolean;
	past?: number;
	future?: number;
}

interface Props {
	points: TrendPoint[];
	timeZone: string;
	label: string;
	/** compact: one line with a dotted fill, for cards. full: axes, past vs forecast, "Sekarang" marker. */
	variant?: 'compact' | 'full';
	/** Line color for the compact variant. */
	color?: string;
	/** dateTime of a point to mark, e.g. the selected history row. */
	selected?: string | null;
	/** Taller plot for full-width page sections. */
	tall?: boolean;
	className?: string;
}

const config = { aqi: { label: 'AQI' } } satisfies ChartConfig;

const MARGIN = {
	compact: { top: 8, right: 20, bottom: 0, left: 20 },
	full: { top: 20, right: 24, bottom: 0, left: 0 }
};

function toRows(points: TrendPoint[]): Row[] {
	const list: Row[] = points.map((p) => ({
		t: Date.parse(p.dateTime),
		aqi: p.aqi,
		forecast: Boolean(p.forecast),
		past: p.forecast ? undefined : p.aqi,
		future: p.forecast ? p.aqi : undefined
	}));
	// The forecast line starts at the last observed point so the two series connect.
	const lastPast = list.findLastIndex((row) => !row.forecast);
	if (lastPast >= 0 && lastPast < list.length - 1) list[lastPast].future = list[lastPast].past;
	return list;
}

function tickTimes(rows: Row[], max: number): number[] {
	const count = Math.min(rows.length, max);
	if (count < 2) return rows.map((row) => row.t);
	return Array.from({ length: count }, (_, i) => rows[Math.round((i * (rows.length - 1)) / (count - 1))].t);
}

/** Where past meets forecast; only drawn when both sides have something to show. */
function nowTime(rows: Row[]): number | null {
	const observed = rows.filter((row) => !row.forecast);
	const hasForecast = observed.length < rows.length;
	return hasForecast && observed.length > 1 ? observed[observed.length - 1].t : null;
}

/** Hour labels; beyond a day the same hour repeats, so they gain the weekday. */
function useTickLabel(rows: Row[], timeZone: string) {
	const locale = useLocale();
	const multiDay = rows.length > 1 && rows.at(-1)!.t - rows[0].t > 26 * 3_600_000;
	const weekday = dateTimeFormat(locale, { weekday: 'short', timeZone });
	return (t: number) => {
		const hour = formatHour(new Date(t).toISOString(), timeZone, locale);
		return multiDay ? `${weekday.format(t)} ${hour}` : hour;
	};
}

function plotHeight(compact: boolean, tall: boolean) {
	if (compact) return 'h-24';
	return tall ? 'h-72 sm:h-80' : 'h-60';
}

/**
 * The figure and its spoken summary render at once; the plot waits for recharts behind a same-size
 * placeholder, so the page never shifts when it arrives.
 */
export function TrendChart({ points, label, variant = 'full', tall = false, className, ...plot }: Props) {
	const { chart } = useDictionary();
	const compact = variant === 'compact';
	const height = plotHeight(compact, tall);

	const values = points.map((p) => p.aqi);
	const summary = values.length
		? fill(chart.summary, { label, min: String(Math.min(...values)), max: String(Math.max(...values)) })
		: label;

	return (
		<figure role="img" aria-label={summary} className={cn('m-0', className)}>
			<Suspense fallback={<div aria-hidden="true" className={cn('w-full', height)} />}>
				<TrendPlot points={points} compact={compact} height={height} {...plot} />
			</Suspense>
		</figure>
	);
}

function TrendPlot({
	points,
	timeZone,
	compact,
	height,
	color = 'var(--primary)',
	selected = null
}: Pick<Props, 'points' | 'timeZone' | 'color' | 'selected'> & { compact: boolean; height: string }) {
	const { AreaChart, Area, Line, CartesianGrid, XAxis, YAxis, ReferenceDot, ReferenceLine } = useRecharts();
	const id = useId().replace(/:/g, '');
	const { chart } = useDictionary();

	const rows = useMemo(() => toRows(points), [points]);
	const ticks = useMemo(() => tickTimes(rows, compact ? 4 : 5), [rows, compact]);
	const tickLabel = useTickLabel(rows, timeZone);
	const nowT = compact ? null : nowTime(rows);
	const marked = selected ? rows.find((row) => row.t === Date.parse(selected)) : undefined;
	const first = compact ? rows[0] : undefined;

	return (
		<ChartContainer config={config} aria-hidden="true" className={cn('aspect-auto w-full', height)}>
			<AreaChart data={rows} accessibilityLayer={false} margin={compact ? MARGIN.compact : MARGIN.full}>
				<defs>
					<pattern id={`${id}-dots`} width="6" height="6" patternUnits="userSpaceOnUse">
						<circle cx="2" cy="2" r="1.2" fill={color} />
					</pattern>
					<linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
						<stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
					</linearGradient>
				</defs>
				{!compact && <CartesianGrid vertical={false} strokeDasharray="3 4" />}
				<XAxis
					dataKey="t"
					type="number"
					scale="time"
					domain={['dataMin', 'dataMax']}
					ticks={ticks}
					tickFormatter={tickLabel}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					interval={0}
					fontSize="0.75rem"
					padding={compact ? { left: 4, right: 4 } : undefined}
				/>
				<YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} hide={compact} width={32} tickLine={false} axisLine={false} fontSize="0.75rem" />
				<ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<TrendTooltip tickLabel={tickLabel} />} />
				{compact ? (
					<Area
						dataKey="aqi"
						type="monotone"
						stroke={color}
						strokeWidth={2.5}
						fill={`url(#${id}-dots)`}
						fillOpacity={0.45}
						dot={false}
						activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: color }}
						isAnimationActive={false}
					/>
				) : (
					<>
						<Area
							dataKey="past"
							type="monotone"
							stroke="var(--primary)"
							strokeWidth={2.5}
							fill={`url(#${id}-fill)`}
							dot={false}
							activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: 'var(--primary)' }}
							connectNulls={false}
							isAnimationActive={false}
						/>
						<Line
							dataKey="future"
							type="monotone"
							stroke="var(--primary)"
							strokeOpacity={0.7}
							strokeWidth={2}
							strokeDasharray="5 5"
							dot={false}
							activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: 'var(--primary)' }}
							isAnimationActive={false}
						/>
					</>
				)}
				{nowT !== null && (
					<ReferenceLine
						x={nowT}
						stroke="var(--muted-foreground)"
						strokeDasharray="2 3"
						label={{ value: chart.now, position: 'top', fontSize: '0.75rem', fill: 'var(--muted-foreground)' }}
					/>
				)}
				{first && <ReferenceDot x={first.t} y={first.aqi} r={5} fill={color} stroke="#fff" strokeWidth={2.5} />}
				{marked && <ReferenceDot x={marked.t} y={marked.aqi} r={6} fill="var(--primary)" stroke="#fff" strokeWidth={3} />}
			</AreaChart>
		</ChartContainer>
	);
}

/** recharts clones this with the hovered point's `active` and `payload`. */
function TrendTooltip({
	active,
	payload,
	tickLabel
}: {
	active?: boolean;
	payload?: ReadonlyArray<{ payload?: unknown }>;
	tickLabel: (t: number) => string;
}) {
	const { chart } = useDictionary();
	const row = payload?.[0]?.payload as Row | undefined;
	if (!active || !row) return null;
	return (
		<div className="meta-copy rounded-lg border bg-popover px-2.5 py-1.5 shadow-md">
			<p className="text-muted-foreground">
				{tickLabel(row.t)}
				{row.forecast && chart.forecastSuffix}
			</p>
			<p className="font-semibold tabular-nums">AQI {row.aqi}</p>
		</div>
	);
}
