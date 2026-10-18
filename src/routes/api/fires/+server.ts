import { FIRMS_MAP_KEY } from '$app/env/private';
import { handleFiresRequest } from '#lib/server/handle-map.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) => handleFiresRequest(request, FIRMS_MAP_KEY);
