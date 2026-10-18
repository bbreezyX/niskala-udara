'use client';

import { useState } from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { HeartPulse, MapPin, TriangleAlert, type LucideIcon } from 'lucide-react';
import { aqiBandIndex } from '@/lib/aqi';
import { HEALTH_GROUPS, type HealthGroup } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

const GROUP_LABELS: Record<HealthGroup, string> = {
	generalPopulation: 'Umum',
	children: 'Anak',
	elderly: 'Lansia',
	pregnantWomen: 'Ibu hamil',
	lungDiseasePopulation: 'Penyakit paru',
	heartDiseasePopulation: 'Penyakit jantung',
	athletes: 'Atlet'
};

/** One line to act on, by UAQI band (0 = worst). Google's own advice follows it verbatim. */
const HEADLINES = [
	'Sebaiknya tetap di dalam ruangan',
	'Kurangi aktivitas berat di luar ruangan',
	'Kelompok sensitif perlu berhati-hati',
	'Aman untuk beraktivitas di luar ruangan',
	'Udara bersih, nikmati aktivitas di luar'
];

/** Long enough that three lines usually cut it off, so the full text sits behind "Selengkapnya". */
const CLAMP_FROM = 180;

export function Recommendation({
	aqi,
	recommendations,
	className
}: {
	aqi: number;
	recommendations: Partial<Record<HealthGroup, string>>;
	className?: string;
}) {
	const groups = HEALTH_GROUPS.filter((group) => recommendations[group]);
	const [picked, setPicked] = useState<HealthGroup>('generalPopulation');
	const [expanded, setExpanded] = useState(false);
	const group = groups.includes(picked) ? picked : groups[0];
	const text = group ? recommendations[group] : undefined;
	const long = (text?.length ?? 0) > CLAMP_FROM;

	return (
		<section aria-labelledby="health-advice" className={cn('grid gap-3 rounded-xl border p-4', className)}>
			<div>
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<HeartPulse className="size-4 text-primary" aria-hidden="true" />
					Rekomendasi kesehatan
				</p>
				<h3 id="health-advice" className="mt-1 text-lg leading-snug font-semibold">
					{HEADLINES[aqiBandIndex(aqi)]}
				</h3>
			</div>
			{groups.length > 1 && (
				<ToggleGroupPrimitive.Root
					type="single"
					value={group}
					onValueChange={(next) => {
						if (!next) return;
						setPicked(next as HealthGroup);
						setExpanded(false);
					}}
					aria-label="Saran untuk kelompok"
					className="flex flex-wrap gap-1.5"
				>
					{groups.map((item) => (
						<ToggleGroupPrimitive.Item
							key={item}
							value={item}
							className="h-8 rounded-full border bg-card px-3 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
						>
							{GROUP_LABELS[item]}
						</ToggleGroupPrimitive.Item>
					))}
				</ToggleGroupPrimitive.Root>
			)}
			{text ? (
				<div>
					<p className={cn('max-w-prose leading-relaxed', long && !expanded && 'line-clamp-3')}>{text}</p>
					{long && (
						<button
							type="button"
							onClick={() => setExpanded((value) => !value)}
							aria-expanded={expanded}
							className="mt-1 min-h-8 text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							{expanded ? 'Ringkas' : 'Selengkapnya'}
						</button>
					)}
				</div>
			) : (
				<p className="text-muted-foreground">Saran lengkap belum tersedia untuk lokasi ini.</p>
			)}
		</section>
	);
}

/** Required by Google Maps Platform policies: keep the strings unlocalized and inside the data container. */
export function Attribution() {
	return (
		<p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 text-sm text-[#5e5e5e]">
			<span className="font-[Roboto,var(--font-sans)] whitespace-nowrap" translate="no">
				Google Maps
			</span>
			<span lang="en" translate="no">
				Source: Includes air quality data from Google
			</span>
		</p>
	);
}

interface StateMessageProps {
	title: string;
	description: string;
	tone?: 'neutral' | 'error';
	icon?: LucideIcon;
	children?: React.ReactNode;
	className?: string;
}

export function StateMessage({ title, description, tone = 'neutral', icon, children, className }: StateMessageProps) {
	const Icon = icon ?? (tone === 'error' ? TriangleAlert : MapPin);
	return (
		<Empty className={cn('rounded-2xl border border-solid bg-card py-12', className)} role={tone === 'error' ? 'alert' : undefined}>
			<EmptyHeader>
				<EmptyMedia
					variant="icon"
					className={cn('size-12 rounded-full', tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary')}
				>
					<Icon className="size-6" />
				</EmptyMedia>
				<EmptyTitle className="text-lg font-semibold">{title}</EmptyTitle>
				<EmptyDescription className="text-base">{description}</EmptyDescription>
			</EmptyHeader>
			{children && <EmptyContent>{children}</EmptyContent>}
		</Empty>
	);
}
