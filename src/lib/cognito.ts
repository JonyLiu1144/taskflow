import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

export async function signUp(email: string, password: string) {
  await cognitoClient.send(new SignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  }));
}

export async function confirmSignUp(email: string, code: string) {
  await cognitoClient.send(new ConfirmSignUpCommand({
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  }));
}

export async function signIn(email: string, password: string) {
  const res = await cognitoClient.send(new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  }));
  return res.AuthenticationResult!;
}

export async function getUser(accessToken: string) {
  const res = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
  const sub = res.UserAttributes?.find(a => a.Name === 'sub')?.Value;
  const email = res.UserAttributes?.find(a => a.Name === 'email')?.Value;
  return { userId: sub!, email: email! };
}
