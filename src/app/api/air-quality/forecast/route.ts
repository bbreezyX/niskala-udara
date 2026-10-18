import { airQualityKey } from '@/lib/server/env';
import { handleForecastRequest } from '@/lib/server/handle-air-quality';

export const POST = (request: Request) => handleForecastRequest(request, airQualityKey());
