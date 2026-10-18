import { airQualityKey } from '@/lib/server/env';
import { handleTileRequest } from '@/lib/server/handle-map';

export async function GET(request: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
	return handleTileRequest(request, await params, airQualityKey());
}
