import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

export async function GET() {
  const env = {
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? null,
    NODE_ENV: process.env.NODE_ENV,
    AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV ?? null,
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME ?? null,
    APP_AWS_ACCESS_KEY_ID: process.env.APP_AWS_ACCESS_KEY_ID ? '✓ set' : '✗ missing',
    APP_AWS_SECRET_ACCESS_KEY: process.env.APP_AWS_SECRET_ACCESS_KEY ? '✓ set' : '✗ missing',
    APP_AWS_REGION: process.env.APP_AWS_REGION ?? null,
  };

  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.APP_AWS_REGION ?? 'ap-northeast-1';

  let dynamoTest: string;
  try {
    const client = new DynamoDBClient({
      region,
      ...(accessKeyId && secretAccessKey && {
        credentials: { accessKeyId, secretAccessKey },
      }),
    });
    const res = await client.send(new ListTablesCommand({}));
    dynamoTest = `✓ connected, tables: ${res.TableNames?.join(', ')}`;
  } catch (err) {
    dynamoTest = `✗ failed: ${String(err)}`;
  }

  return Response.json({ env, dynamoTest });
}
