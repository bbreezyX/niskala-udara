import { airQualityKey } from '@/lib/server/env';
import { handleHistoryRequest } from '@/lib/server/handle-air-quality';

export const POST = (request: Request) => handleHistoryRequest(request, airQualityKey());
