import { airQualityKey } from '@/lib/server/env';
import { handleAirQualityRequest } from '@/lib/server/handle-air-quality';

export const POST = (request: Request) => handleAirQualityRequest(request, airQualityKey());
