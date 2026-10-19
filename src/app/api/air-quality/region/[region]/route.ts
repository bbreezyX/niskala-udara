import { airQualityKey } from '@/lib/server/env';
import { handleRegionRequest } from '@/lib/server/region-air-quality';

export async function GET(request: Request, { params }: { params: Promise<{ region: string }> }) {
	return handleRegionRequest(request, (await params).region, airQualityKey());
}
