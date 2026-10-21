'use client';

import { Suspense, useId, useMemo } from 'react';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { AQI_BANDS, aqiBand } from '@/lib/aqi';
import { useRecharts } from '@/lib/client/recharts';
import { dateTimeFormat } from '@/lib/date-format';
import { formatDay, formatHour } from '@/lib/format';
import { dayRows, type HourSlot } from '@/lib/history';
import { fill } from '@/lib/i18n/config';
import type { AirQualityData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDictionary, useLocale } from './locale-provider';

interface Props {
	slots: HourSlot[];
	timeZone: string;
	/** `t` of the selected slot. */
	selected: number;
	marks: { worst: AirQualityData; best: AirQualityData; latest: AirQualityData };
	onSelect: (t: number) => void;
	label: string;
}

interface Row {
	t: number;
	/** Null for an hour Google skipped, so the line breaks there instead of bridging it. */
	aqi: number | null;
}

const config = { aqi: { label: 'AQI' } } satisfies ChartConfig;
const HEIGHT = 'h-72 sm:h-80';

/**
 * The figure and its spoken summary render at once; the plot waits for recharts behind a same-size
 * placeholder. Keyboard users pick hours from the table below, so the plot itself stays out of the tab order.
 */
export function HistoryChart({ slots, label, ...plot }: Props) {
	const { chart } = useDictionary();
	const values = slots.flatMap((slot) => (slot.hour ? [slot.hour.index.aqi] : []));
	const summary = values.length
		? fill(chart.summary, { label, min: String(Math.min(...values)), max: String(Math.max(...values)) })
		: label;

	return (
		<figure role="img" aria-label={summary} className="m-0">
			<Suspense fallback={<div aria-hidden="true" className={cn('w-full', HEIGHT)} />}>
				<HistoryPlot slots={slots} {...plot} />
			</Suspense>
		</figure>
	);
}

function HistoryPlot({ slots, timeZone, selected, marks, onSelect }: Omit<Props, 'label'>) {
	const { AreaChart, Area, XAxis, YAxis, ReferenceArea, ReferenceDot, ReferenceLine } = useRecharts();
	const id = useId().replace(/:/g, '');
	const locale = useLocale();
	const t = useDictionary();

	const rows = useMemo<Row[]>(() => slots.map((slot) => ({ t: slot.t, aqi: slot.hour?.index.aqi ?? null })), [slots]);
	// Each day after the first starts at midnight: those are the dividers, and with the first slot, the ticks.
	const dayStarts = useMemo(() => dayRows(slots, timeZone).map((day) => day.t), [slots, timeZone]);
	const dayLabel = dateTimeFormat(locale, { weekday: 'short', day: 'numeric', timeZone });

	const latestT = Date.parse(marks.latest.dataTime);
	const pins = [
		{ hour: marks.worst, title: t.history.chart.worst, edge: false },
		{ hour: marks.best, title: t.history.chart.best, edge: false },
		{ hour: marks.latest, title: t.history.chart.latest, edge: true }
	].filter((pin, i, all) => !pin.edge || all.slice(0, i).every((other) => other.hour.dataTime !== pin.hour.dataTime));
	const picked = selected !== latestT ? rows.find((row) => row.t === selected && row.aqi !== null) : undefined;

	return (
		<ChartContainer config={config} aria-hidden="true" className={cn('aspect-auto w-full cursor-pointer', HEIGHT)}>
			<AreaChart
				data={rows}
				accessibilityLayer={false}
				margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
				onClick={(state) => {
					const slot = slots[Number(state.activeIndex)];
					if (slot?.hour) onSelect(slot.t);
				}}
			>
				<defs>
					<linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
						<stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
					</linearGradient>
				</defs>
				{AQI_BANDS.map((band, i) => (
					<ReferenceArea
						key={band.key}
						y1={band.min}
						y2={AQI_BANDS[i + 1]?.min ?? 100}
						fill={band.fill}
						fillOpacity={0.1}
						stroke="none"
						label={{ value: t.aqi.bands[band.key], position: 'insideTopRight', fill: band.ink, fontSize: '0.75rem' }}
					/>
				))}
				{dayStarts.slice(1).map((start) => (
					<ReferenceLine key={start} x={start} stroke="var(--border)" />
				))}
				<XAxis
					dataKey="t"
					type="number"
					scale="time"
					domain={['dataMin', 'dataMax']}
					ticks={dayStarts}
					tickFormatter={(value: number) => dayLabel.format(value)}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					interval={0}
					fontSize="0.75rem"
				/>
				<YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} width={32} tickLine={false} axisLine={false} fontSize="0.75rem" />
				<ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<HistoryTooltip timeZone={timeZone} />} />
				<Area
					dataKey="aqi"
					type="monotone"
					stroke="var(--primary)"
					strokeWidth={2.5}
					fill={`url(#${id}-fill)`}
					dot={false}
					activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: 'var(--primary)' }}
					connectNulls={false}
					isAnimationActive={false}
				/>
				{pins.map(({ hour, title, edge }) => {
					const aqi = hour.index.aqi;
					return (
						<ReferenceDot
							key={title}
							x={Date.parse(hour.dataTime)}
							y={aqi}
							r={5}
							fill={aqiBand(aqi).fill}
							stroke="#fff"
							strokeWidth={2}
							label={{
								value: `${title} ${aqi}`,
								// The latest hour sits on the right edge, so its label goes left to stay inside the plot.
								position: edge ? 'left' : aqi >= 60 ? 'bottom' : 'top',
								fontSize: '0.75rem',
								fontWeight: 600,
								fill: 'var(--foreground)'
							}}
						/>
					);
				})}
				{picked && <ReferenceDot x={picked.t} y={picked.aqi!} r={6} fill="var(--primary)" stroke="#fff" strokeWidth={3} />}
			</AreaChart>
		</ChartContainer>
	);
}

/** recharts clones this with the hovered point's `active` and `payload`. */
function HistoryTooltip({
	active,
	payload,
	timeZone
}: {
	active?: boolean;
	payload?: ReadonlyArray<{ payload?: unknown }>;
	timeZone: string;
}) {
	const locale = useLocale();
	const t = useDictionary();
	const row = payload?.[0]?.payload as Row | undefined;
	if (!active || !row) return null;
	const iso = new Date(row.t).toISOString();
	return (
		<div className="meta-copy rounded-lg border bg-popover px-2.5 py-1.5 shadow-md">
			<p className="text-muted-foreground">
				{formatDay(iso, timeZone, locale)} {formatHour(iso, timeZone, locale)}
			</p>
			<p className="font-semibold tabular-nums">{row.aqi === null ? t.history.table.noData : `AQI ${row.aqi}`}</p>
		</div>
	);
}
