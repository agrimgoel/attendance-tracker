import { gasGet } from '@/lib/gas';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await gasGet('getSubjects');
  return Response.json(data);
}
