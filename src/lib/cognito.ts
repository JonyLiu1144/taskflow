import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';

function getClient() {
  const accessKeyId =
    process.env.APP_AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.APP_AWS_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
  const region =
    process.env.APP_AWS_REGION ?? process.env.AWS_REGION ?? 'ap-northeast-1';

  return new CognitoIdentityProviderClient({
    region,
    ...(accessKeyId && secretAccessKey && {
      credentials: { accessKeyId, secretAccessKey },
    }),
  });
}

function clientId() {
  const id = process.env.COGNITO_CLIENT_ID;
  if (!id) throw new Error('COGNITO_CLIENT_ID is not set');
  return id;
}

export async function signUp(email: string, password: string) {
  await getClient().send(new SignUpCommand({
    ClientId: clientId(),
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  }));
}

export async function confirmSignUp(email: string, code: string) {
  await getClient().send(new ConfirmSignUpCommand({
    ClientId: clientId(),
    Username: email,
    ConfirmationCode: code,
  }));
}

export async function signIn(email: string, password: string) {
  const res = await getClient().send(new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId(),
    AuthParameters: { USERNAME: email, PASSWORD: password },
  }));
  return res.AuthenticationResult!;
}

export async function getUser(accessToken: string) {
  const res = await getClient().send(new GetUserCommand({ AccessToken: accessToken }));
  const sub = res.UserAttributes?.find(a => a.Name === 'sub')?.Value;
  const email = res.UserAttributes?.find(a => a.Name === 'email')?.Value;
  return { userId: sub!, email: email! };
}

export async function refreshTokens(refreshToken: string) {
  const res = await getClient().send(new InitiateAuthCommand({
    AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
    ClientId: clientId(),
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  }));
  return res.AuthenticationResult!;
}
