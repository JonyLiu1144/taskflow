import { requireUser } from '@/lib/auth-server';
import { updateTodo, deleteTodo } from '@/lib/dynamo';
import { Todo } from '@/types/todo';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userOrResponse = await requireUser();
  if (userOrResponse instanceof Response) return userOrResponse;
  const { id } = await params;
  const updates: Partial<Todo> = await request.json();
  await updateTodo(userOrResponse.userId, id, updates);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userOrResponse = await requireUser();
  if (userOrResponse instanceof Response) return userOrResponse;
  const { id } = await params;
  await deleteTodo(userOrResponse.userId, id);
  return Response.json({ ok: true });
}
