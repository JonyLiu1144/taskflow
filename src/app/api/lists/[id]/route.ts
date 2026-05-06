import { requireUser } from '@/lib/auth-server';
import { deleteList } from '@/lib/dynamo';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userOrResponse = await requireUser();
  if (userOrResponse instanceof Response) return userOrResponse;
  const { id } = await params;
  await deleteList(userOrResponse.userId, id);
  return Response.json({ ok: true });
}
