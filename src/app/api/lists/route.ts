import { requireUser } from '@/lib/auth-server';
import { getLists, putList } from '@/lib/dynamo';
import { TodoList } from '@/types/todo';

export async function GET() {
  const userOrResponse = await requireUser();
  if (userOrResponse instanceof Response) return userOrResponse;
  const lists = await getLists(userOrResponse.userId);
  return Response.json(lists);
}

export async function POST(request: Request) {
  const userOrResponse = await requireUser();
  if (userOrResponse instanceof Response) return userOrResponse;
  const list: TodoList = await request.json();
  await putList(userOrResponse.userId, list);
  return Response.json({ ok: true });
}
