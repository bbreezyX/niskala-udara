import { openMeteoKey } from '@/lib/server/env';
import { handleWindRequest } from '@/lib/server/handle-map';

export const GET = (request: Request) => handleWindRequest(request, openMeteoKey());
