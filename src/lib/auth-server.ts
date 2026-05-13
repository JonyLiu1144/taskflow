import { cookies } from 'next/headers';
import { refreshTokens } from '@/lib/cognito';

// 本地解码 Cognito JWT，无需调用 Cognito API
function decodeJwt(token: string): { sub: string; username: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    return {
      sub: payload.sub,
      username: payload.username ?? payload.email ?? payload.sub,
      exp: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}

function isExpired(exp: number) {
  // 提前 60 秒判断过期，避免边界情况
  return exp < Math.floor(Date.now() / 1000) + 60;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  // 尝试用现有 access token
  if (accessToken) {
    const payload = decodeJwt(accessToken);
    if (payload && !isExpired(payload.exp)) {
      return { userId: payload.sub, email: payload.username };
    }
  }

  // access token 不存在或已过期，尝试用 refresh token 续期
  if (refreshToken) {
    try {
      const result = await refreshTokens(refreshToken);
      if (result.AccessToken) {
        // 写入新的 access token
        cookieStore.set('access_token', result.AccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: result.ExpiresIn ?? 3600,
          path: '/',
        });
        const payload = decodeJwt(result.AccessToken);
        if (payload) {
          return { userId: payload.sub, email: payload.username };
        }
      }
    } catch {
      // refresh token 也失效了，需要重新登录
    }
  }

  return null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}
