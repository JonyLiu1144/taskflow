'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'signin' | 'signup' | 'confirm';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'signin', email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        router.push('/');
        router.refresh();
      } else if (mode === 'signup') {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'signup', email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMode('confirm');
      } else if (mode === 'confirm') {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm', email, code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMode('signin');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-slate-800 mb-1">TaskFlow</h1>
        <p className="text-sm text-slate-400 mb-6">
          {mode === 'signin' && '登录你的账户'}
          {mode === 'signup' && '创建新账户'}
          {mode === 'confirm' && '验证邮箱'}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode !== 'confirm' && (
            <>
              <input
                type="email"
                placeholder="邮箱"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="password"
                placeholder="密码（至少8位）"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </>
          )}
          {mode === 'confirm' && (
            <input
              type="text"
              placeholder="输入邮箱收到的验证码"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? '请稍候…' : mode === 'signin' ? '登录' : mode === 'signup' ? '注册' : '验证'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-400">
          {mode === 'signin' ? (
            <>还没有账户？<button onClick={() => setMode('signup')} className="text-indigo-500 hover:underline">注册</button></>
          ) : (
            <>已有账户？<button onClick={() => setMode('signin')} className="text-indigo-500 hover:underline">登录</button></>
          )}
        </div>
      </div>
    </div>
  );
}
