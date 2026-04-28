'use client';

import { useState, useMemo } from 'react';
import { Todo, TodoList } from '@/types/todo';

interface Props {
  todos: Todo[];
  lists: TodoList[];
}

function fmt(s: number) {
  if (s <= 0) return '0分';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}小时${m}分`;
  if (h > 0) return `${h}小时`;
  return `${m}分`;
}

export default function TimeStats({ todos, lists }: Props) {
  const [open, setOpen] = useState(true);
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);

  const entries = useMemo(() => {
    return todos
      .map(t => ({
        todo: t,
        list: lists.find(l => l.id === t.listId),
        secs: (t.dailyTime?.[todayKey] ?? 0) + (t.isTracking && t.trackingStart
          ? Math.floor((Date.now() - t.trackingStart) / 1000)
          : 0),
      }))
      .filter(e => e.secs > 0)
      .sort((a, b) => b.secs - a.secs);
  }, [todos, lists, todayKey]);

  const totalSecs = useMemo(() => entries.reduce((sum, e) => sum + e.secs, 0), [entries]);

  // Group by list for donut
  const byList = useMemo(() => {
    const map: Record<string, { color: string; name: string; secs: number }> = {};
    entries.forEach(e => {
      const key = e.list?.id ?? 'other';
      if (!map[key]) map[key] = { color: e.list?.color ?? '#94a3b8', name: e.list?.name ?? '其他', secs: 0 };
      map[key].secs += e.secs;
    });
    return Object.values(map).sort((a, b) => b.secs - a.secs);
  }, [entries]);

  // Build SVG donut arcs
  const donut = useMemo(() => {
    const R = 28, CX = 36, CY = 36;
    const circ = 2 * Math.PI * R;
    let offset = 0;
    return byList.map(g => {
      const pct = totalSecs > 0 ? g.secs / totalSecs : 0;
      const dash = pct * circ;
      const arc = { color: g.color, dashArray: `${dash} ${circ - dash}`, dashOffset: -offset * circ };
      offset += pct;
      return arc;
    });
  }, [byList, totalSecs]);

  if (entries.length === 0) {
    return (
      <div className="mx-4 mb-3 px-4 py-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex items-center gap-3">
        <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <span className="text-xs text-slate-400">今日时间统计</span>
        <span className="text-xs text-slate-300">· 点击任务卡片右侧的计时按钮开始记录</span>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-3 rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <span className="text-xs font-semibold text-slate-700">今日时间统计</span>
        <span className="text-xs text-indigo-500 font-mono font-semibold">{fmt(totalSecs)}</span>

        {/* Mini list badges */}
        <div className="flex items-center gap-1 ml-1">
          {byList.slice(0, 3).map(g => (
            <span key={g.name} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: `${g.color}18`, color: g.color }}>
              {g.name} {Math.round(g.secs / totalSecs * 100)}%
            </span>
          ))}
        </div>

        <svg className={`w-3.5 h-3.5 text-slate-300 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 pt-1 flex gap-5 animate-slide-down">
          {/* Donut chart */}
          <div className="shrink-0 relative">
            <svg width="72" height="72">
              <circle cx="36" cy="36" r="28" fill="none" stroke="#f1f5f9" strokeWidth="8"/>
              {donut.map((arc, i) => (
                <circle key={i}
                  cx="36" cy="36" r="28"
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="8"
                  strokeLinecap="butt"
                  strokeDasharray={arc.dashArray}
                  strokeDashoffset={arc.dashOffset}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '36px 36px' }}
                />
              ))}
              <text x="36" y="40" textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">
                {fmt(totalSecs)}
              </text>
            </svg>
          </div>

          {/* Task bars */}
          <div className="flex-1 min-w-0 space-y-2">
            {entries.map(({ todo, list, secs }) => {
              const pct = totalSecs > 0 ? Math.round(secs / totalSecs * 100) : 0;
              const color = list?.color ?? '#94a3b8';
              return (
                <div key={todo.id} className="flex items-center gap-2 min-w-0">
                  {/* Color dot */}
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }}/>

                  {/* Title */}
                  <span className={`text-[11px] truncate w-28 shrink-0 ${todo.completed ? 'text-slate-300 line-through' : 'text-slate-600'}`}>
                    {todo.title}
                  </span>

                  {/* Bar */}
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>

                  {/* Time + pct */}
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 w-14 text-right">
                    {fmt(secs)} <span className="text-slate-300">{pct}%</span>
                  </span>

                  {/* Tracking indicator */}
                  {todo.isTracking && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"/>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
