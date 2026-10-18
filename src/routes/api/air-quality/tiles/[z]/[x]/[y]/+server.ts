import { GOOGLE_AIR_QUALITY_API_KEY } from '$app/env/private';
import { handleTileRequest } from '#lib/server/handle-map.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request, params }) =>
	handleTileRequest(request, params, GOOGLE_AIR_QUALITY_API_KEY);
