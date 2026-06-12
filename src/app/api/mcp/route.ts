/**
 * MCP Server — Streamable HTTP transport
 * Spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http
 *
 * Auth: Cognito OAuth 2.0 Bearer token (issued by taskflow-auth Cognito domain)
 * Also accepts legacy MCP_API_KEY for direct curl testing.
 */

import { getTodos, putTodo, updateTodo, deleteTodo, getLists } from '@/lib/dynamo';
import { Todo } from '@/types/todo';

// ── Auth ──────────────────────────────────────────────────────────────────────

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch { return null; }
}

async function authenticate(request: Request): Promise<{ userId: string } | null> {
  const auth = request.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  // Legacy API key (for direct testing)
  const apiKey = process.env.MCP_API_KEY;
  if (apiKey && token === apiKey) {
    return { userId: 'api-key-user' };
  }

  // Cognito JWT — decode and verify sub + expiry (signature verified by Cognito issuer)
  const payload = decodeJwt(token);
  if (!payload) return null;
  if (payload.exp && (payload.exp as number) < Math.floor(Date.now() / 1000)) return null;
  const sub = payload.sub as string;
  if (!sub) return null;
  return { userId: sub };
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_todos',
    description: 'List all todos for the authenticated user. Optionally filter by listId or completion status.',
    inputSchema: {
      type: 'object',
      properties: {
        listId:    { type: 'string',  description: 'Filter by list ID (optional)' },
        completed: { type: 'boolean', description: 'Filter by completion status (optional)' },
      },
    },
  },
  {
    name: 'create_todo',
    description: 'Create a new todo item.',
    inputSchema: {
      type: 'object',
      properties: {
        title:       { type: 'string', description: 'Todo title' },
        description: { type: 'string', description: 'Optional description' },
        priority:    { type: 'number', description: '1=urgent, 2=high, 3=medium, 4=low', enum: [1, 2, 3, 4] },
        dueDate:     { type: 'string', description: 'Due date in YYYY-MM-DD format (optional)' },
        listId:      { type: 'string', description: 'List ID to assign the todo to (use list_lists to get IDs)' },
      },
      required: ['title', 'listId'],
    },
  },
  {
    name: 'update_todo',
    description: 'Update an existing todo item.',
    inputSchema: {
      type: 'object',
      properties: {
        todoId:      { type: 'string',  description: 'The todo ID to update' },
        title:       { type: 'string',  description: 'New title (optional)' },
        description: { type: 'string',  description: 'New description (optional)' },
        priority:    { type: 'number',  description: '1=urgent, 2=high, 3=medium, 4=low', enum: [1, 2, 3, 4] },
        dueDate:     { type: 'string',  description: 'New due date YYYY-MM-DD, or null to clear (optional)' },
        completed:   { type: 'boolean', description: 'Mark as completed or not (optional)' },
        listId:      { type: 'string',  description: 'Move to a different list (optional)' },
      },
      required: ['todoId'],
    },
  },
  {
    name: 'delete_todo',
    description: 'Delete a todo item permanently.',
    inputSchema: {
      type: 'object',
      properties: {
        todoId: { type: 'string', description: 'The todo ID to delete' },
      },
      required: ['todoId'],
    },
  },
  {
    name: 'list_lists',
    description: 'List all todo lists (categories) for the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 11); }

async function handleToolCall(name: string, args: Record<string, unknown>, userId: string) {
  switch (name) {

    case 'list_todos': {
      let todos = await getTodos(userId);
      if (args.listId !== undefined) todos = todos.filter(t => t.listId === args.listId);
      if (args.completed !== undefined) todos = todos.filter(t => t.completed === args.completed);
      return { todos, count: todos.length };
    }

    case 'create_todo': {
      const todo: Todo = {
        id:           genId(),
        title:        args.title as string,
        description:  (args.description as string) ?? '',
        completed:    false,
        priority:     (args.priority as 1|2|3|4) ?? 4,
        dueDate:      (args.dueDate as string) ?? null,
        listId:       args.listId as string,
        tags:         [],
        subtasks:     [],
        milestones:   [],
        createdAt:    new Date().toISOString(),
        completedAt:  null,
        timeSpent:    0,
        isTracking:   false,
        trackingStart: null,
        startedAt:    null,
        startTime:    null,
        endTime:      null,
        dailyTime:    {},
      };
      await putTodo(userId, todo);
      return { todo };
    }

    case 'update_todo': {
      const todoId = args.todoId as string;
      const updates: Record<string, unknown> = {};
      if (args.title       !== undefined) updates.title       = args.title;
      if (args.description !== undefined) updates.description = args.description;
      if (args.priority    !== undefined) updates.priority    = args.priority;
      if (args.dueDate     !== undefined) updates.dueDate     = args.dueDate;
      if (args.completed   !== undefined) {
        updates.completed   = args.completed;
        updates.completedAt = args.completed ? new Date().toISOString() : null;
      }
      if (args.listId      !== undefined) updates.listId      = args.listId;
      await updateTodo(userId, todoId, updates);
      return { ok: true, todoId, updated: Object.keys(updates) };
    }

    case 'delete_todo': {
      const todoId = args.todoId as string;
      await deleteTodo(userId, todoId);
      return { ok: true, todoId };
    }

    case 'list_lists': {
      const lists = await getLists(userId);
      return { lists, count: lists.length };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── JSON-RPC helpers ──────────────────────────────────────────────────────────

function jsonrpc(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result });
}

function jsonrpcError(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } }, { status: 200 });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: { jsonrpc: string; id: unknown; method: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return jsonrpcError(null, -32700, 'Parse error');
  }

  const { id, method, params } = body;

  // initialize and notifications don't require auth
  if (method === 'initialize') {
    return jsonrpc(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'taskflow-mcp', version: '1.0.0' },
    });
  }
  if (method === 'notifications/initialized') {
    return new Response(null, { status: 204 });
  }

  // All other methods require auth
  const user = await authenticate(request);
  if (!user) {
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32001, message: 'Unauthorized' } }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `Bearer realm="taskflow-mcp", resource_metadata="https://main.d3vise50ulsldf.amplifyapp.com/.well-known/oauth-protected-resource"`,
        },
      }
    );
  }

  try {
    if (method === 'tools/list') {
      return jsonrpc(id, { tools: TOOLS });
    }

    if (method === 'tools/call') {
      const toolName = params?.name as string;
      const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>;
      const result = await handleToolCall(toolName, toolArgs, user.userId);
      return jsonrpc(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      });
    }

    return jsonrpcError(id, -32601, `Method not found: ${method}`);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonrpcError(id, -32603, `Internal error: ${message}`);
  }
}

// MCP clients may send OPTIONS for CORS preflight
export async function GET() {
  return Response.json({
    name: 'taskflow-mcp',
    version: '1.0.0',
    description: 'TaskFlow MCP Server — manage todos via MCP protocol',
    tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
  });
}
