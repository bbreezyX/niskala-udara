'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
	createColumnHelper,
	createPaginatedRowModel,
	createSortedRowModel,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
	useTable
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { aqiBand } from '@/lib/aqi';
import { CITIES, cityNote, REGIONS } from '@/lib/config/cities';
import { HISTORY_RANGES, type HistoryRange } from '@/lib/coordinates';
import { postJson, toRemote, type Remote } from '@/lib/client/api';
import { ERROR_MESSAGES, formatDataTime, formatDay, formatHour, pollutantLabel, timeZoneLabel } from '@/lib/format';
import type { AirQualityData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AqiBadge } from './aqi-badge';
import { AqiGauge } from './aqi-gauge';
import { Attribution, Recommendation, StateMessage } from './info-blocks';
import { PollutantBreakdown } from './pollutant-breakdown';
import { TrendChart } from './trend-chart';

interface HourRow {
	t: number;
	hour: AirQualityData;
	/** AQI change against the hour before; null for the oldest hour. */
	change: number | null;
}

const PAGE_SIZE = 12;

const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel()
});

const helper = createColumnHelper<typeof features, HourRow>();

/** Change against the hour before. Higher UAQI is better, so a drop is shown as worse. */
function deltaOf(change: number | null) {
	if (change === null) return { short: '–', spoken: 'Awal data', className: 'text-muted-foreground', icon: null };
	if (change > 0) return { short: String(change), spoken: `Membaik ${change} dari jam sebelumnya`, className: 'text-success', icon: ArrowUp };
	if (change < 0) return { short: String(-change), spoken: `Memburuk ${-change} dari jam sebelumnya`, className: 'text-destructive', icon: ArrowDown };
	return { short: 'tetap', spoken: 'Tetap dari jam sebelumnya', className: 'text-muted-foreground', icon: null };
}

function columnsFor(timeZone: string) {
	return helper.columns([
		helper.accessor('t', {
			header: 'Jam',
			cell: ({ row }) => (
				<span className="grid leading-tight">
					<span className="font-semibold tabular-nums">{formatHour(row.original.hour.dataTime, timeZone)}</span>
					{/* Sorted by time, day separators carry the date; otherwise each row shows it. */}
					<span className="text-xs text-muted-foreground in-data-[grouped=true]:sr-only">{formatDay(row.original.hour.dataTime, timeZone)}</span>
				</span>
			)
		}),
		helper.accessor((row) => row.hour.index.aqi, {
			id: 'aqi',
			header: 'AQI',
			cell: ({ row }) => {
				const { index } = row.original.hour;
				const band = aqiBand(index.aqi);
				return (
					<span className="flex items-center gap-3">
						{/* The bar is the AQI out of 100, in the band's color: the category is read from its color. */}
						<span className="h-2.5 max-w-64 flex-1 rounded-full bg-muted" aria-hidden="true">
							<span className="block h-full rounded-full" style={{ width: `${Math.max(3, Math.min(100, index.aqi))}%`, background: band.fill }} />
						</span>
						<span className="w-7 text-right font-semibold tabular-nums">{index.aqiDisplay}</span>
						<span className="sr-only">{index.category ?? band.label}</span>
					</span>
				);
			}
		}),
		helper.display({
			id: 'dominant',
			header: 'Polutan',
			cell: ({ row }) => {
				const dominant = row.original.hour.index.dominantPollutant;
				return dominant ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{pollutantLabel(dominant)}</span> : '–';
			}
		}),
		helper.display({
			id: 'trend',
			header: 'Perubahan',
			cell: ({ row }) => {
				const delta = deltaOf(row.original.change);
				const Icon = delta.icon;
				return (
					<span className={cn('inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums', delta.className)}>
						{Icon && <Icon className="size-3.5" aria-hidden="true" />}
						<span aria-hidden="true">{delta.short}</span>
						<span className="sr-only">{delta.spoken}</span>
					</span>
				);
			}
		})
	]);
}

const COLUMN_CLASS: Record<string, string> = {
	t: 'w-24',
	aqi: 'w-full',
	dominant: 'max-sm:hidden',
	trend: 'text-right'
};

const EMPTY: HourRow[] = [];

export function HistoryView({ configured }: { configured: boolean }) {
	const [cityId, setCityId] = useState(CITIES[0].id);
	const [range, setRange] = useState<HistoryRange>(HISTORY_RANGES[0]);
	const [history, setHistory] = useState<Remote<AirQualityData[]>>({ status: 'idle' });
	const [selectedTime, setSelectedTime] = useState<number | null>(null);
	const [reloadVersion, setReloadVersion] = useState(0);
	const panel = useRef<HTMLElement>(null);

	const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];

	// One request per city/range; a newer selection aborts the older one.
	useEffect(() => {
		if (!configured) return;
		const controller = new AbortController();
		setHistory({ status: 'loading' });
		setSelectedTime(null);
		postJson<AirQualityData[]>(
			'/api/air-quality/history',
			{ latitude: city.latitude, longitude: city.longitude, hours: range },
			controller.signal
		).then((result) => {
			if (result) setHistory(toRemote(result));
		});
		return () => controller.abort();
	}, [configured, city.latitude, city.longitude, range, reloadVersion]);

	const hours = useMemo(() => (history.status === 'success' ? history.data : []), [history]);
	const rows = useMemo(
		() =>
			hours.length === 0
				? EMPTY
				: hours.map((hour, i) => ({ t: Date.parse(hour.dataTime), hour, change: i > 0 ? hour.index.aqi - hours[i - 1].index.aqi : null })),
		[hours]
	);
	const columns = useMemo(() => columnsFor(city.timeZone), [city.timeZone]);

	const table = useTable({
		features,
		columns,
		data: rows,
		initialState: { sorting: [{ id: 't', desc: true }], pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
		enableSortingRemoval: false
	});

	const newest = rows.at(-1);
	const selected = rows.find((row) => row.t === selectedTime) ?? newest;

	function select(t: number) {
		setSelectedTime(t);
		// When the panel sits below the table, bring it into view.
		if (panel.current && !matchMedia('(min-width: 1100px)').matches) panel.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
	}

	if (!configured) {
		return <StateMessage tone="error" title={ERROR_MESSAGES.not_configured.title} description={ERROR_MESSAGES.not_configured.description} />;
	}

	const pageCount = table.getPageCount();
	const { pageIndex } = table.state.pagination;
	const groupedByDay = table.state.sorting[0]?.id === 't';
	const dayLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', timeZone: city.timeZone });

	return (
		<div className="grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
			<Card className="min-w-0 rounded-2xl">
				<CardHeader className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0">
						<CardTitle className="text-lg font-semibold">Catatan per jam</CardTitle>
						<CardDescription>
							{cityNote(city)} · waktu dalam {timeZoneLabel(city.timeZone)}
						</CardDescription>
					</div>
					{/* Phones: one row where the city picker takes the free space and truncates; the range keeps its size. */}
					<div className="flex w-full items-center gap-2 sm:w-auto">
						<Select value={cityId} onValueChange={setCityId}>
							<SelectTrigger aria-label="Kota" className="h-10! min-w-0 flex-1 rounded-full bg-card px-4 font-semibold sm:w-48 sm:flex-none">
								<SelectValue />
							</SelectTrigger>
							<SelectContent
								position="popper"
								align="start"
								sideOffset={6}
								collisionPadding={16}
								className="max-h-[min(24rem,var(--radix-select-content-available-height))] w-(--radix-select-trigger-width) min-w-56 rounded-2xl p-1"
							>
								{REGIONS.map((region) => (
									<SelectGroup key={region.id}>
										<SelectLabel>{region.name}</SelectLabel>
										{CITIES.filter((c) => c.region === region.id).map((option) => (
											<SelectItem key={option.id} value={option.id} className="min-h-10 rounded-lg">
												{option.name}
											</SelectItem>
										))}
									</SelectGroup>
								))}
							</SelectContent>
						</Select>
						<ToggleGroup
							type="single"
							value={String(range)}
							// A single-select toggle can be cleared by clicking the active item; keep one selected.
							onValueChange={(next) => next && setRange(Number(next) as HistoryRange)}
							aria-label="Rentang waktu"
							spacing={0}
							className="shrink-0 rounded-full bg-muted p-1"
						>
							{HISTORY_RANGES.map((hours) => (
								<ToggleGroupItem
									key={hours}
									value={String(hours)}
									className="h-8 rounded-full! px-3 text-muted-foreground sm:px-4 data-[state=on]:bg-card data-[state=on]:text-primary data-[state=on]:shadow-sm"
								>
									{hours} jam
								</ToggleGroupItem>
							))}
						</ToggleGroup>
					</div>
				</CardHeader>

				<CardContent className="grid gap-4">
					{history.status === 'error' ? (
						<div role="alert" className="grid justify-items-start gap-2 rounded-xl bg-destructive/5 p-6">
							<p className="font-semibold text-destructive">{ERROR_MESSAGES[history.code].title}</p>
							<p className="text-sm text-muted-foreground">{ERROR_MESSAGES[history.code].description}</p>
							<Button size="lg" className="mt-2" onClick={() => setReloadVersion((v) => v + 1)}>
								Coba lagi
							</Button>
						</div>
					) : (
						<>
							<Table aria-busy={history.status !== 'success'} data-grouped={groupedByDay} className="text-sm">
								<TableCaption className="sr-only">Kualitas udara per jam di {city.name}. Pilih baris untuk melihat detail.</TableCaption>
								<TableHeader>
									{table.getHeaderGroups().map((group) => (
										<TableRow key={group.id} className="hover:bg-transparent">
											{group.headers.map((header) => {
												const sorted = header.column.getIsSorted();
												const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
												return (
													<TableHead
														key={header.id}
														aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
														className={cn('h-10 px-2 text-xs font-semibold text-muted-foreground', COLUMN_CLASS[header.column.id])}
													>
														{header.column.getCanSort() ? (
															<button
																type="button"
																onClick={header.column.getToggleSortingHandler()}
																className="inline-flex min-h-9 items-center gap-1 hover:text-foreground"
															>
																<table.FlexRender header={header} />
																<SortIcon className={cn('size-3.5', !sorted && 'opacity-40')} aria-hidden="true" />
															</button>
														) : (
															<table.FlexRender header={header} />
														)}
													</TableHead>
												);
											})}
										</TableRow>
									))}
								</TableHeader>
								<TableBody>
									{history.status === 'success'
										? table.getRowModel().rows.map((row, i, all) => {
												const isSelected = row.original.t === selected?.t;
												const day = dayLabel.format(row.original.t);
												const newDay = groupedByDay && (i === 0 || dayLabel.format(all[i - 1].original.t) !== day);
												return (
													<Fragment key={row.id}>
														{newDay && (
															<TableRow className="border-0 hover:bg-transparent">
																<TableCell colSpan={4} className="px-2 pt-4 pb-1 text-xs font-semibold text-muted-foreground">
																	{day}
																</TableCell>
															</TableRow>
														)}
														<TableRow
															data-state={isSelected ? 'selected' : undefined}
															onClick={() => select(row.original.t)}
															className="cursor-pointer border-0 hover:bg-muted/60 data-[state=selected]:bg-secondary [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl"
														>
															{row.getAllCells().map((cell) => (
																<TableCell key={cell.id} className={cn('h-11 px-2 py-1', COLUMN_CLASS[cell.column.id])}>
																	{cell.column.id === 't' ? (
																		<button
																			type="button"
																			aria-pressed={isSelected}
																			onClick={(event) => {
																				event.stopPropagation();
																				select(row.original.t);
																			}}
																			className="min-h-10 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
																		>
																			<table.FlexRender cell={cell} />
																		</button>
																	) : (
																		<table.FlexRender cell={cell} />
																	)}
																</TableCell>
															))}
														</TableRow>
													</Fragment>
												);
											})
										: Array.from({ length: 8 }, (_, i) => (
												<TableRow key={i} aria-hidden="true">
													<TableCell colSpan={4}>
														<Skeleton className="h-8" />
													</TableCell>
												</TableRow>
											))}
								</TableBody>
							</Table>

							{pageCount > 1 && (
								<nav aria-label="Halaman catatan" className="flex items-center justify-between gap-2">
									<Button variant="outline" size="lg" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
										<ChevronLeft data-icon="inline-start" />
										Sebelumnya
									</Button>
									<p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
										Halaman {pageIndex + 1} dari {pageCount}
									</p>
									<Button variant="outline" size="lg" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
										Berikutnya
										<ChevronRight data-icon="inline-end" />
									</Button>
								</nav>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<aside
				ref={panel}
				tabIndex={-1}
				aria-labelledby="detail-title"
				className="flex scroll-mt-20 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 outline-none min-[1100px]:sticky min-[1100px]:top-20 min-[1100px]:max-h-[calc(100dvh-6rem)]"
			>
				{/*
				  The card keeps its rounded shape; scrolling happens in this inset layer (16px from top and bottom,
				  4px from the right) so the scrollbar never crosses the rounded corners. Padding adds up to the same 20px.
				*/}
				<div className="my-4 mr-1 grid min-h-0 content-start gap-5 py-1 pr-4 pl-5 min-[1100px]:overflow-y-auto">
					{selected ? (
						<>
							<header>
								<h2 id="detail-title" className="text-lg font-semibold">
									{city.name}
								</h2>
								<p className="text-sm text-muted-foreground">
									<time dateTime={selected.hour.dataTime}>{formatDataTime(selected.hour.dataTime, city.timeZone)}</time>
								</p>
							</header>
							<div className="flex flex-wrap items-center gap-5">
								<AqiGauge size="lg" aqi={selected.hour.index.aqi} display={selected.hour.index.aqiDisplay} />
								<div className="grid min-w-48 flex-1 justify-items-start gap-2">
									<AqiBadge aqi={selected.hour.index.aqi} category={selected.hour.index.category} color={selected.hour.index.color} />
									<p className="text-sm font-semibold text-muted-foreground">{selected.hour.index.displayName}</p>
									{selected.hour.index.dominantPollutant && (
										<p className="text-muted-foreground">
											Polutan dominan:{' '}
											<strong className="font-semibold text-foreground">{pollutantLabel(selected.hour.index.dominantPollutant)}</strong>
										</p>
									)}
									<p className="text-xs text-muted-foreground">Skala 0–100. Semakin tinggi, semakin baik.</p>
								</div>
							</div>
							<section className="grid gap-3 rounded-xl border p-4">
								<h3 className="font-semibold">Tren AQI {range} jam</h3>
								<TrendChart
									points={hours.map((h) => ({ dateTime: h.dataTime, aqi: h.index.aqi }))}
									timeZone={city.timeZone}
									selected={selected.hour.dataTime}
									label={`Tren AQI ${city.name}, ${range} jam terakhir`}
								/>
							</section>
							<section className="@container grid gap-3">
								<h3 className="font-semibold">Kadar polutan pada jam ini</h3>
								<PollutantBreakdown pollutants={selected.hour.pollutants} dominant={selected.hour.index.dominantPollutant} />
							</section>
							<Recommendation aqi={selected.hour.index.aqi} recommendations={selected.hour.recommendations ?? {}} />
							<Attribution />
						</>
					) : (
						<>
							<h2 id="detail-title" className="sr-only">
								Detail
							</h2>
							<Skeleton className="h-40 rounded-xl" />
							<Skeleton className="h-64 rounded-xl" />
						</>
					)}
				</div>
			</aside>
		</div>
	);
}
