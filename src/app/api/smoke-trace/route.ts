import { firmsKey, openMeteoKey } from '@/lib/server/env';
import { handleSmokeTraceRequest } from '@/lib/server/handle-smoke-trace';

export const POST = (request: Request) => handleSmokeTraceRequest(request, firmsKey(), openMeteoKey());
