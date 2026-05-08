import { requireUser } from '@/lib/auth-server';
import { getTodos, putTodo } from '@/lib/dynamo';
import { Todo } from '@/types/todo';

export async function GET() {
  try {
    const userOrResponse = await requireUser();
    if (userOrResponse instanceof Response) {
      console.error('[GET /api/todos] Unauthorized');
      return userOrResponse;
    }
    console.log('[GET /api/todos] userId:', userOrResponse.userId);
    const todos = await getTodos(userOrResponse.userId);
    console.log('[GET /api/todos] found:', todos.length);
    return Response.json(todos);
  } catch (err) {
    console.error('[GET /api/todos] error:', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userOrResponse = await requireUser();
    if (userOrResponse instanceof Response) {
      console.error('[POST /api/todos] Unauthorized');
      return userOrResponse;
    }
    const todo: Todo = await request.json();
    console.log('[POST /api/todos] userId:', userOrResponse.userId, 'todoId:', todo.id);
    await putTodo(userOrResponse.userId, todo);
    console.log('[POST /api/todos] saved ok');
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/todos] error:', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
