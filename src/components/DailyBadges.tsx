'use client';

import { useMemo } from 'react';
import { Todo } from '@/types/todo';

interface Props {
  todos: Todo[];
}

/** local-consistent date key, matching the app's existing `toISOString().split('T')[0]` convention */
function dateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** count completed tasks per day, bucketed by completedAt */
export function completionCounts(todos: Todo[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of todos) {
    if (!t.completed || !t.completedAt) continue;
    const key = dateKey(new Date(t.completedAt));
    map[key] = (map[key] ?? 0) + 1;
  }
  return map;
}

/**
 * streak: consecutive days with ≥1 completion, counting back from today.
 * today not-yet-done is a grace day and doesn't break the streak.
 */
export function computeStreak(todos: Todo[]): number {
  const counts = completionCounts(todos);
  let s = 0;
  const base = new Date();
  for (let i = 0; ; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const c = counts[dateKey(d)] ?? 0;
    if (c > 0) s++;
    else if (i === 0) continue; // today not done yet — grace
    else break;
  }
  return s;
}

interface Tier {
  ring: string;
  bg: string;
  text: string;
  medal: string;
  glow: string;
}

/** Map a completion count to a medal tier */
function tierFor(count: number): Tier {
  if (count >= 7) return {
    bg: 'linear-gradient(135deg,#f59e0b,#d97706)', text: '#fff', medal: '👑',
    ring: '#f59e0b', glow: '0 4px 14px rgba(245,158,11,0.45)',
  };
  if (count >= 5) return {
    bg: 'linear-gradient(135deg,#fbbf24,#f59e0b)', text: '#fff', medal: '🥇',
    ring: '#fbbf24', glow: '0 4px 14px rgba(251,191,36,0.4)',
  };
  if (count >= 3) return {
    bg: 'linear-gradient(135deg,#cbd5e1,#94a3b8)', text: '#fff', medal: '🥈',
    ring: '#94a3b8', glow: '0 4px 12px rgba(148,163,184,0.35)',
  };
  if (count >= 1) return {
    bg: 'linear-gradient(135deg,#d6a06a,#b45309)', text: '#fff', medal: '🥉',
    ring: '#d6a06a', glow: '0 4px 12px rgba(180,83,9,0.3)',
  };
  return {
    bg: '#f1f5f9', text: '#cbd5e1', medal: '',
    ring: 'transparent', glow: 'none',
  };
}

export default function DailyBadges({ todos }: Props) {
  const todayKey = useMemo(() => dateKey(new Date()), []);

  // count completed tasks per day, bucketed by completedAt
  const counts = useMemo(() => completionCounts(todos), [todos]);

  // last 7 days, oldest → today
  const days = useMemo(() => {
    const arr: { key: string; date: Date; count: number }[] = [];
    const base = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const key = dateKey(d);
      arr.push({ key, date: d, count: counts[key] ?? 0 });
    }
    return arr;
  }, [counts]);

  const weekTotal = useMemo(() => days.reduce((s, d) => s + d.count, 0), [days]);
  const todayCount = counts[todayKey] ?? 0;

  // streak: consecutive days with ≥1 completion, counting back from today
  // (today not-yet-done is a grace day and doesn't break the streak)
  const streak = useMemo(() => computeStreak(todos), [todos]);

  const bestDay = useMemo(() => Math.max(0, ...days.map(d => d.count)), [days]);

  return (
    <div className="mx-4 mb-3 rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-50">
        <span className="text-base leading-none">🏅</span>
        <span className="text-xs font-semibold text-slate-700">成就墙</span>
        <span className="text-[11px] text-slate-400">
          本周完成 <span className="font-mono font-semibold text-indigo-500">{weekTotal}</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">
              🔥 连续 {streak} 天
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500">
            今日 {todayCount}
          </span>
        </div>
      </div>

      {/* Badge row */}
      <div className="flex items-end justify-between gap-1 px-3 py-3">
        {days.map(({ key, date, count }) => {
          const tier = tierFor(count);
          const isToday = key === todayKey;
          const isBest = count > 0 && count === bestDay;
          return (
            <div key={key} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <span className={`text-[10px] font-medium ${isToday ? 'text-indigo-500' : 'text-slate-400'}`}>
                {isToday ? '今天' : WEEKDAYS[date.getDay()]}
              </span>

              <div
                title={`${key} · 完成 ${count} 个任务`}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isToday ? 'animate-pulse-ring' : ''
                }`}
                style={{
                  background: tier.bg,
                  boxShadow: tier.glow,
                  border: count === 0 ? '1.5px dashed #e2e8f0' : `2px solid ${tier.ring}`,
                }}
              >
                {count > 0 ? (
                  <span className="font-bold text-sm tabular-nums" style={{ color: tier.text }}>
                    {count}
                  </span>
                ) : (
                  <span className="text-slate-300 text-xs">·</span>
                )}

                {/* medal badge corner */}
                {tier.medal && (
                  <span className="absolute -top-1.5 -right-1.5 text-[13px] leading-none drop-shadow-sm">
                    {tier.medal}
                  </span>
                )}
                {/* best-of-week star */}
                {isBest && bestDay >= 1 && (
                  <span className="absolute -bottom-1 -left-1 text-[11px] leading-none">⭐</span>
                )}
              </div>

              <span className="text-[9px] text-slate-300 tabular-nums">
                {date.getMonth() + 1}/{date.getDate()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
