import { cookies } from 'next/headers';

// 本地解码 Cognito JWT，无需调用 Cognito API
// Cognito Access Token payload 包含 sub（userId）和 username（email）
function decodeJwt(token: string): { sub: string; username: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    // 检查是否过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub, username: payload.username ?? payload.email ?? payload.sub };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  return { userId: payload.sub, email: payload.username };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}
