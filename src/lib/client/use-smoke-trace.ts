'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Coordinates, SmokeTrace } from '@/lib/types';
import { pending, postJson, toRemote, type Remote } from './api';

/**
 * The smoke trace for a place, computed on the server. A new place or a retry aborts the request in
 * flight and keeps the last trace on screen meanwhile; null coordinates stay idle.
 */
export function useSmokeTrace(coordinates: Coordinates | null): readonly [Remote<SmokeTrace>, () => void] {
	const [remote, setRemote] = useState<Remote<SmokeTrace>>({ status: 'idle' });
	const [attempt, setAttempt] = useState(0);
	const latitude = coordinates?.latitude;
	const longitude = coordinates?.longitude;

	useEffect(() => {
		if (latitude === undefined || longitude === undefined) {
			setRemote({ status: 'idle' });
			return;
		}
		const controller = new AbortController();
		setRemote(pending);
		postJson<SmokeTrace>('/api/smoke-trace', { latitude, longitude }, controller.signal).then((result) => {
			if (result) setRemote(toRemote(result));
		});
		return () => controller.abort();
	}, [latitude, longitude, attempt]);

	const retry = useCallback(() => setAttempt((n) => n + 1), []);
	return [remote, retry] as const;
}
