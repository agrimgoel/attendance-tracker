import { gasPost } from '@/lib/gas';

export async function POST(request: Request) {
  const body = await request.json();
  const { date, slotId, subjectId, status } = body;
  if (!date || !slotId || !subjectId || !status) {
    return Response.json({ error: 'Missing date, slotId, subjectId, or status' }, { status: 400 });
  }
  const data = await gasPost('markAttendance', { date, slotId, subjectId, status });
  return Response.json(data);
}
