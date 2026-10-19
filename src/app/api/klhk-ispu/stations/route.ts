import { handleKlhkNationalRequest } from '@/lib/server/klhk-ispu';

// Every province page in one response, for the map's station layer.
export async function GET(request: Request) {
	return handleKlhkNationalRequest(request);
}
