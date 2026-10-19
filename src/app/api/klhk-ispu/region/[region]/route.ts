import { handleKlhkRequest } from '@/lib/server/klhk-ispu';

export async function GET(request: Request, { params }: { params: Promise<{ region: string }> }) {
	return handleKlhkRequest(request, (await params).region);
}
