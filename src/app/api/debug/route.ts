import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

export async function GET() {
  const env = {
    APP_AWS_REGION: process.env.APP_AWS_REGION ?? null,
    APP_AWS_ACCESS_KEY_ID: process.env.APP_AWS_ACCESS_KEY_ID ? '✓ set' : '✗ missing',
    APP_AWS_SECRET_ACCESS_KEY: process.env.APP_AWS_SECRET_ACCESS_KEY ? '✓ set' : '✗ missing',
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? null,
    NODE_ENV: process.env.NODE_ENV,
  };

  let dynamoTest: string;
  try {
    const client = new DynamoDBClient({
      region: process.env.APP_AWS_REGION ?? 'ap-northeast-1',
      credentials: {
        accessKeyId: (process.env.APP_AWS_ACCESS_KEY_ID ?? '')!,
        secretAccessKey: (process.env.APP_AWS_SECRET_ACCESS_KEY ?? '')!,
      },
    });
    const res = await client.send(new ListTablesCommand({}));
    dynamoTest = `✓ connected, tables: ${res.TableNames?.join(', ')}`;
  } catch (err) {
    dynamoTest = `✗ failed: ${String(err)}`;
  }

  return Response.json({ env, dynamoTest });
}
