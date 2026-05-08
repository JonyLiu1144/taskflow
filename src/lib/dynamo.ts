import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Todo, TodoList } from '@/types/todo';

function getDb() {
  const client = new DynamoDBClient({
    region: process.env.APP_AWS_REGION ?? process.env.AWS_REGION ?? 'ap-northeast-1',
    credentials: {
      accessKeyId: (process.env.APP_AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID)!,
      secretAccessKey: (process.env.APP_AWS_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY)!,
    },
  });
  return DynamoDBDocumentClient.from(client);
}

const TODOS_TABLE = 'taskflow-todos';
const LISTS_TABLE = 'taskflow-lists';

// --- Todos ---

export async function getTodos(userId: string): Promise<Todo[]> {
  const res = await getDb().send(new QueryCommand({
    TableName: TODOS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));
  return (res.Items ?? []) as Todo[];
}

export async function putTodo(userId: string, todo: Todo) {
  await getDb().send(new PutCommand({
    TableName: TODOS_TABLE,
    Item: { userId, todoId: todo.id, ...todo },
  }));
}

export async function updateTodo(userId: string, todoId: string, updates: Partial<Todo>) {
  const entries = Object.entries(updates);
  if (!entries.length) return;
  const expr = entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));
  await getDb().send(new UpdateCommand({
    TableName: TODOS_TABLE,
    Key: { userId, todoId },
    UpdateExpression: `SET ${expr}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function deleteTodo(userId: string, todoId: string) {
  await getDb().send(new DeleteCommand({ TableName: TODOS_TABLE, Key: { userId, todoId } }));
}

// --- Lists ---

export async function getLists(userId: string): Promise<TodoList[]> {
  const res = await getDb().send(new QueryCommand({
    TableName: LISTS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));
  return (res.Items ?? []) as TodoList[];
}

export async function putList(userId: string, list: TodoList) {
  await getDb().send(new PutCommand({
    TableName: LISTS_TABLE,
    Item: { userId, listId: list.id, ...list },
  }));
}

export async function deleteList(userId: string, listId: string) {
  await getDb().send(new DeleteCommand({ TableName: LISTS_TABLE, Key: { userId, listId } }));
}
