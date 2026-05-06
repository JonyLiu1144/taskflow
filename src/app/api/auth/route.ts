import { cookies } from 'next/headers';
import { signIn, signUp, confirmSignUp } from '@/lib/cognito';

export async function POST(request: Request) {
  const body = await request.json();
  const { action, email, password, code } = body;

  try {
    if (action === 'signup') {
      await signUp(email, password);
      return Response.json({ ok: true, needsConfirmation: true });
    }

    if (action === 'confirm') {
      await confirmSignUp(email, code);
      return Response.json({ ok: true });
    }

    if (action === 'signin') {
      const result = await signIn(email, password);
      const cookieStore = await cookies();
      cookieStore.set('access_token', result.AccessToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: result.ExpiresIn ?? 3600,
        path: '/',
      });
      return Response.json({ ok: true });
    }

    if (action === 'signout') {
      const cookieStore = await cookies();
      cookieStore.delete('access_token');
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 400 });
  }
}
