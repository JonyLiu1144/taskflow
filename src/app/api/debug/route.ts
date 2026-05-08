import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

export async function GET() {
  const env = {
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? null,
    NODE_ENV: process.env.NODE_ENV,
    AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV ?? null,
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME ?? null,
  };

  let dynamoTest: string;
  try {
    const client = new DynamoDBClient({ region: 'ap-northeast-1' });
    const res = await client.send(new ListTablesCommand({}));
    dynamoTest = `✓ connected, tables: ${res.TableNames?.join(', ')}`;
  } catch (err) {
    dynamoTest = `✗ failed: ${String(err)}`;
  }

  return Response.json({ env, dynamoTest });
}
