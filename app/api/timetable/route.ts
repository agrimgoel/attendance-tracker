import { gasGet, gasPost } from '@/lib/gas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const day = searchParams.get('day');
  if (!day) return Response.json({ error: 'Missing day param' }, { status: 400 });

  const data = await gasGet('getTimetable', { day });
  return Response.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { day, subjectId, slotId, action } = body;

  if (action === 'add') {
    if (!day || !subjectId) {
      return Response.json({ error: 'Missing day or subjectId' }, { status: 400 });
    }
    const data = await gasPost('addSubjectToDay', { day, subjectId });
    return Response.json(data);
  }

  if (action === 'remove') {
    if (!day || !slotId) {
      return Response.json({ error: 'Missing day or slotId' }, { status: 400 });
    }
    const data = await gasPost('removeSubjectFromDay', { day, slotId });
    return Response.json(data);
  }

  return Response.json({ error: 'Missing or invalid action' }, { status: 400 });
}
