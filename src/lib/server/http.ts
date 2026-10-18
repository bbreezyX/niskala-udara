import type { ApiErrorCode, ApiResponse } from '@/lib/types';

export const STATUS: Record<ApiErrorCode, number> = {
	invalid_request: 400,
	not_configured: 503,
	not_authorized: 502,
	quota_exceeded: 503,
	location_unsupported: 422,
	no_data: 502,
	timeout: 504,
	upstream_error: 502
};

/** Google data is never cached (Maps Platform terms); NASA FIRMS data may be cached briefly. */
export function respond(body: ApiResponse<unknown>, status = 200, cacheControl = 'no-store'): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', 'cache-control': cacheControl }
	});
}

export function fail(code: ApiErrorCode, status = STATUS[code]): Response {
	return respond({ error: { code } }, status);
}

/** Sanitized: callers pass only codes, statuses and durations; never keys or coordinates. */
export function log(scope: string, code: ApiErrorCode, detail: string, startedAt: number) {
	console.error(`[${scope}] ${code}: ${detail} (${Math.round(performance.now() - startedAt)} ms)`);
}

/** Browsers send this header; it blocks other sites from spending the quota through these proxies. */
export function isCrossSite(request: Request): boolean {
	return request.headers.get('sec-fetch-site') === 'cross-site';
}
