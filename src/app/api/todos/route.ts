import { requireUser } from '@/lib/auth-server';
import { getTodos, putTodo } from '@/lib/dynamo';
import { Todo } from '@/types/todo';

export async function GET() {
  const userOrResponse = await requireUser();
  if (userOrResponse instanceof Response) return userOrResponse;
  const todos = await getTodos(userOrResponse.userId);
  return Response.json(todos);
}

export async function POST(request: Request) {
  const userOrResponse = await requireUser();
  if (userOrResponse instanceof Response) return userOrResponse;
  const todo: Todo = await request.json();
  await putTodo(userOrResponse.userId, todo);
  return Response.json({ ok: true });
}
