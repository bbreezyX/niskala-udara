import { firmsKey } from '@/lib/server/env';
import { handleFiresRequest } from '@/lib/server/handle-map';

export const GET = (request: Request) => handleFiresRequest(request, firmsKey());
