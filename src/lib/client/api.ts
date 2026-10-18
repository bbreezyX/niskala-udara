import type { ClientErrorCode } from '@/lib/format';
import type { ApiResponse } from '@/lib/types';

/** Slightly longer than the server's 10 s upstream timeout, as a last resort. */
const CLIENT_TIMEOUT_MS = 15_000;

export type Result<T> = { ok: true; data: T } | { ok: false; code: ClientErrorCode };

export type Remote<T> =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'success'; data: T; refreshing: boolean }
	| { status: 'error'; code: ClientErrorCode };

/** POSTs JSON to an internal endpoint. See `requestJson`. */
export function postJson<T>(path: string, body: unknown, signal: AbortSignal): Promise<Result<T> | null> {
	return requestJson<T>(
		path,
		{ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
		signal
	);
}

export function getJson<T>(path: string, signal: AbortSignal): Promise<Result<T> | null> {
	return requestJson<T>(path, { method: 'GET' }, signal);
}

/**
 * Calls an internal endpoint. Resolves to `null` when the caller aborted,
 * so a superseded request can never overwrite newer state.
 */
async function requestJson<T>(path: string, init: RequestInit, signal: AbortSignal): Promise<Result<T> | null> {
	const controller = new AbortController();
	const forwardAbort = () => controller.abort();
	signal.addEventListener('abort', forwardAbort, { once: true });
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, CLIENT_TIMEOUT_MS);

	try {
		const response = await fetch(path, { ...init, signal: controller.signal });
		const json = (await response.json().catch(() => null)) as ApiResponse<T> | null;
		if (signal.aborted) return null;
		if (response.ok && json && 'data' in json) return { ok: true, data: json.data };
		return { ok: false, code: json && 'error' in json ? json.error.code : 'upstream_error' };
	} catch {
		if (signal.aborted) return null;
		return { ok: false, code: timedOut ? 'timeout' : 'network' };
	} finally {
		clearTimeout(timer);
		signal.removeEventListener('abort', forwardAbort);
	}
}

/** Keeps showing old data while refreshing; otherwise shows a loading state. */
export function pending<T>(remote: Remote<T>): Remote<T> {
	return remote.status === 'success' ? { ...remote, refreshing: true } : { status: 'loading' };
}

export function toRemote<T>(result: Result<T>): Remote<T> {
	return result.ok
		? { status: 'success', data: result.data, refreshing: false }
		: { status: 'error', code: result.code };
}
