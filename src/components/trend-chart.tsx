'use client';

import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { formatHour } from '@/lib/format';
import { fill, INTL_LOCALES } from '@/lib/i18n/config';
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

export function TrendChart({ points, timeZone, label, variant = 'full', color = 'var(--primary)', selected = null, tall = false, className }: Props) {
	const id = useId().replace(/:/g, '');
	const compact = variant === 'compact';

	const rows = useMemo(() => {
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
	}, [points]);

	const lastPast = rows.findLast((row) => !row.forecast);
	const hasForecast = rows.some((row) => row.forecast);
	const nowT = !compact && lastPast && hasForecast && rows.filter((r) => !r.forecast).length > 1 ? lastPast.t : null;
	const marked = selected ? rows.find((row) => row.t === Date.parse(selected)) : undefined;

	const ticks = useMemo(() => {
		const count = Math.min(rows.length, compact ? 4 : 5);
		if (count < 2) return rows.map((row) => row.t);
		return Array.from({ length: count }, (_, i) => rows[Math.round((i * (rows.length - 1)) / (count - 1))].t);
	}, [rows, compact]);

	// Beyond a day the same hour repeats, so prefix the weekday.
	const multiDay = rows.length > 1 && rows.at(-1)!.t - rows[0].t > 26 * 3_600_000;
	const locale = useLocale();
	const { chart } = useDictionary();
	const weekday = useMemo(() => new Intl.DateTimeFormat(INTL_LOCALES[locale], { weekday: 'short', timeZone }), [timeZone, locale]);
	const tickLabel = (t: number) => {
		const iso = new Date(t).toISOString();
		return multiDay ? `${weekday.format(t)} ${formatHour(iso, timeZone, locale)}` : formatHour(iso, timeZone, locale);
	};

	const values = points.map((p) => p.aqi);
	const summary = values.length
		? fill(chart.summary, { label, min: String(Math.min(...values)), max: String(Math.max(...values)) })
		: label;

	return (
		<figure role="img" aria-label={summary} className={cn('m-0', className)}>
			<ChartContainer
				config={config}
				aria-hidden="true"
				className={cn('aspect-auto w-full', compact ? 'h-24' : tall ? 'h-72 sm:h-80' : 'h-60')}
			>
				<AreaChart data={rows} accessibilityLayer={false} margin={compact ? { top: 8, right: 20, bottom: 0, left: 20 } : { top: 20, right: 24, bottom: 0, left: 0 }}>
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
						fontSize={11}
						padding={compact ? { left: 4, right: 4 } : undefined}
					/>
					<YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} hide={compact} width={32} tickLine={false} axisLine={false} fontSize={11} />
					<ChartTooltip
						cursor={{ strokeDasharray: '3 3' }}
						content={({ active, payload }) => {
							const row = payload?.[0]?.payload as Row | undefined;
							if (!active || !row) return null;
							return (
								<div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
									<p className="text-muted-foreground">
										{tickLabel(row.t)}
										{row.forecast && chart.forecastSuffix}
									</p>
									<p className="font-semibold tabular-nums">AQI {row.aqi}</p>
								</div>
							);
						}}
					/>
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
							label={{ value: chart.now, position: 'top', fontSize: 11, fill: 'var(--muted-foreground)' }}
						/>
					)}
					{compact && rows[0] && (
						<ReferenceDot x={rows[0].t} y={rows[0].aqi} r={5} fill={color} stroke="#fff" strokeWidth={2.5} />
					)}
					{marked && <ReferenceDot x={marked.t} y={marked.aqi} r={6} fill="var(--primary)" stroke="#fff" strokeWidth={3} />}
				</AreaChart>
			</ChartContainer>
		</figure>
	);
}
