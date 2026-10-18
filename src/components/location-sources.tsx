'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, LocateFixed, MapPinOff } from 'lucide-react';
import { CITIES, DEFAULT_REGION, REGIONS } from '@/lib/config/cities';
import { MAP_BOUNDS, MAP_TIME_ZONE } from '@/lib/config/map';
import { parseCoordinates, roundCoordinates } from '@/lib/coordinates';
import { cityFeed, LocationFeed } from '@/lib/client/location-feed';
import type { Coordinates } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { StateMessage } from './info-blocks';
import { LocationDetail } from './location-detail';

/** A one-off feed (device or map point) that is aborted when the page leaves. */
function useOwnFeed(create: () => LocationFeed | null, deps: unknown[]) {
	const feed = useMemo(create, deps);
	useEffect(() => () => feed?.dispose(), [feed]);
	return feed;
}

function SourceShell({ back, children }: { back: { href: string; label: string }; children: React.ReactNode }) {
	return (
		<div className="mx-auto grid max-w-7xl gap-4 px-4 pt-6 sm:px-6 md:pt-8">
			<Button asChild variant="ghost" size="lg" className="-ml-2.5 h-10 justify-self-start text-muted-foreground">
				<Link href={back.href}>
					<ArrowLeft data-icon="inline-start" />
					{back.label}
				</Link>
			</Button>
			{children}
		</div>
	);
}

export function CityDetail({ cityId, configured }: { cityId: string; configured: boolean }) {
	const city = CITIES.find((c) => c.id === cityId)!;
	const feed = useMemo(() => cityFeed(city), [city]);
	const region = REGIONS.find((r) => r.id === city.region)!;
	const back = { href: region.id === DEFAULT_REGION ? '/' : `/?region=${region.id}`, label: 'Kembali ke Pantauan' };
	const related = useMemo(
		() =>
			CITIES.filter((c) => c.region === city.region).map((c) => ({
				href: `/location/${c.id}`,
				name: c.name,
				current: c.id === city.id,
				feed: cityFeed(c)
			})),
		[city]
	);

	return <LocationDetail feed={feed} configured={configured} back={back} eyebrow={region.name} related={related} />;
}

type GeoState =
	| { status: 'locating' }
	| { status: 'ready'; coordinates: Coordinates }
	| { status: 'error'; message: string };

const HOME = { href: '/', label: 'Kembali ke Pantauan' };

/** Asks the browser for the device position on this page; the coordinates never go into a URL. */
export function DeviceDetail({ configured }: { configured: boolean }) {
	const [geo, setGeo] = useState<GeoState>({ status: 'locating' });
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (!('geolocation' in navigator)) {
			setGeo({ status: 'error', message: 'Browser ini tidak mendukung lokasi perangkat. Silakan pilih kota.' });
			return;
		}
		let active = true;
		setGeo({ status: 'locating' });
		navigator.geolocation.getCurrentPosition(
			(position) => active && setGeo({ status: 'ready', coordinates: roundCoordinates(position.coords) }),
			(error) =>
				active &&
				setGeo({
					status: 'error',
					message:
						error.code === error.PERMISSION_DENIED
							? 'Izin lokasi ditolak. Kamu tetap bisa memilih kota dari daftar.'
							: 'Lokasi tidak dapat ditemukan. Coba lagi atau pilih kota dari daftar.'
				}),
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
		);
		return () => {
			active = false;
		};
	}, [attempt]);

	const coordinates = geo.status === 'ready' ? geo.coordinates : null;
	const feed = useOwnFeed(
		() =>
			coordinates &&
			new LocationFeed({
				key: 'device',
				name: 'Lokasi saya',
				note: 'Berdasarkan lokasi perangkat, dibulatkan sekitar 100 m',
				coordinates,
				// The device is at the location, so its own time zone is the right one.
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				region: null
			}),
		[coordinates?.latitude, coordinates?.longitude]
	);

	if (feed) return <LocationDetail feed={feed} configured={configured} back={HOME} />;

	return (
		<SourceShell back={HOME}>
			{geo.status === 'error' ? (
				<StateMessage tone="error" icon={MapPinOff} title="Lokasi belum didapat" description={geo.message}>
					<div className="flex flex-wrap justify-center gap-2">
						<Button size="lg" onClick={() => setAttempt((n) => n + 1)}>
							<LocateFixed data-icon="inline-start" />
							Coba lagi
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link href="/">Pilih kota</Link>
						</Button>
					</div>
				</StateMessage>
			) : (
				<StateMessage icon={LocateFixed} title="Mencari lokasimu…" description="Izinkan akses lokasi di browser. Koordinat dibulatkan sekitar 100 meter sebelum dikirim.">
					<Spinner className="size-6 text-primary" />
				</StateMessage>
			)}
		</SourceShell>
	);
}

const MAP_BACK = { href: '/map', label: 'Kembali ke Peta' };

function subscribeHash(callback: () => void) {
	window.addEventListener('hashchange', callback);
	return () => window.removeEventListener('hashchange', callback);
}

/**
 * A point picked on the map, read from the URL hash (`#lat,lng`). The hash stays in the browser,
 * so the coordinates are never sent to the server or written to its logs.
 */
export function PointDetail({ configured }: { configured: boolean }) {
	const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => null);
	const coordinates = useMemo(() => {
		if (!hash) return null;
		const [latitude, longitude] = hash.slice(1).split(',').map(Number);
		const parsed = parseCoordinates({ latitude, longitude });
		return parsed && roundCoordinates(parsed);
	}, [hash]);

	const feed = useOwnFeed(() => {
		if (!coordinates) return null;
		const { latitude, longitude } = coordinates;
		const onMap = longitude >= MAP_BOUNDS.west && longitude <= MAP_BOUNDS.east && latitude >= MAP_BOUNDS.south && latitude <= MAP_BOUNDS.north;
		return new LocationFeed({
			key: `point:${latitude},${longitude}`,
			name: 'Titik dipilih',
			note: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
			coordinates,
			// The map is limited to Sumatra, which is entirely WIB.
			timeZone: onMap ? MAP_TIME_ZONE : Intl.DateTimeFormat().resolvedOptions().timeZone,
			region: null
		});
	}, [coordinates?.latitude, coordinates?.longitude]);

	if (feed) return <LocationDetail feed={feed} configured={configured} back={MAP_BACK} eyebrow="Titik di peta" />;
	if (hash === null) return null;

	return (
		<SourceShell back={MAP_BACK}>
			<StateMessage tone="error" icon={MapPinOff} title="Titik tidak valid" description="Pilih titik langsung di peta untuk melihat kualitas udaranya.">
				<Button asChild size="lg">
					<Link href="/map">Buka peta</Link>
				</Button>
			</StateMessage>
		</SourceShell>
	);
}
