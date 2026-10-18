import { GOOGLE_AIR_QUALITY_API_KEY } from '$app/env/private';
import { handleHistoryRequest } from '#lib/server/handle-air-quality.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request }) => handleHistoryRequest(request, GOOGLE_AIR_QUALITY_API_KEY);
