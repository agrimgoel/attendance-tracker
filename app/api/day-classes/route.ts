import { gasGet } from '@/lib/gas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return Response.json({ error: 'Missing date param' }, { status: 400 });

  const data = await gasGet('getDayClasses', { date });
  return Response.json(data);
}
