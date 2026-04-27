'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Todo } from '@/types/todo';

const MODES = {
  pomodoro:   { label: '专注',  minutes: 25, color: '#6366f1' },
  short:      { label: '短休',  minutes: 5,  color: '#10b981' },
  long:       { label: '长休',  minutes: 15, color: '#06b6d4' },
} as const;

type Mode = keyof typeof MODES;

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  todos: Todo[];
  linkedTodoId: string | null;
  onLinkTodo: (id: string | null) => void;
  onTimeAdd: (todoId: string, seconds: number) => void;
}

export default function PomodoroTimer({ todos, linkedTodoId, onLinkTodo, onTimeAdd }: Props) {
  const [mode, setMode]         = useState<Mode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(MODES.pomodoro.minutes * 60);
  const [running, setRunning]   = useState(false);
  const [pomodoros, setPomodoros] = useState(0);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [completed, setCompleted] = useState(false);

  const totalSeconds    = MODES[mode].minutes * 60;
  const progress        = (totalSeconds - timeLeft) / totalSeconds;
  const strokeDashoffset = CIRCUMFERENCE * progress;

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const linkedAccRef = useRef(0);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (linkedTodoId && linkedAccRef.current > 0) {
      onTimeAdd(linkedTodoId, linkedAccRef.current);
      linkedAccRef.current = 0;
    }
  }, [linkedTodoId, onTimeAdd]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setRunning(false);
            setCompleted(true);
            if (mode === 'pomodoro') setPomodoros(p => p + 1);
            if (linkedTodoId && linkedAccRef.current > 0) {
              onTimeAdd(linkedTodoId, linkedAccRef.current);
              linkedAccRef.current = 0;
            }
            return 0;
          }
          if (linkedTodoId) linkedAccRef.current++;
          return prev - 1;
        });
      }, 1000);
    } else {
      stop();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function switchMode(m: Mode) {
    stop();
    setRunning(false);
    setMode(m);
    setTimeLeft(MODES[m].minutes * 60);
    setCompleted(false);
    linkedAccRef.current = 0;
  }

  function reset() {
    stop();
    setRunning(false);
    setTimeLeft(totalSeconds);
    setCompleted(false);
    linkedAccRef.current = 0;
  }

  function toggle() {
    setCompleted(false);
    setRunning(r => !r);
  }

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  const cfg      = MODES[mode];
  const linkedTodo = todos.find(t => t.id === linkedTodoId);

  return (
    <div className="w-72 shrink-0 bg-white border-l border-slate-100 flex flex-col animate-slide-in-right">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍅</span>
          <h2 className="font-semibold text-slate-800 text-sm">番茄钟</h2>
          <div className="ml-auto flex items-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i < pomodoros % 4 ? 'bg-indigo-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mx-4 mt-4 p-1 bg-slate-100 rounded-xl">
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === m
                ? 'bg-white text-slate-800 shadow-sm shadow-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {MODES[m].label}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div className="flex flex-col items-center py-6">
        <div className="relative">
          <svg width="136" height="136" className="-rotate-90">
            <circle
              cx="68" cy="68" r={RADIUS}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="8"
            />
            <circle
              cx="68" cy="68" r={RADIUS}
              fill="none"
              stroke={cfg.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`font-mono text-3xl font-bold tabular-nums ${running && timeLeft <= 10 ? 'animate-timer-pulse text-red-500' : 'text-slate-800'}`}
            >
              {minutes}:{seconds}
            </span>
            <span className="text-xs text-slate-400 mt-0.5">{cfg.label}时间</span>
          </div>
        </div>

        {completed && (
          <div className="mt-2 text-sm font-medium text-indigo-600 animate-scale-in">
            🎉 完成！本轮 {mode === 'pomodoro' ? '专注' : '休息'}结束
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 pb-5">
        <button
          onClick={reset}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          title="重置"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>

        <button
          onClick={toggle}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: cfg.color,
            boxShadow: `0 8px 24px ${cfg.color}50`,
          }}
        >
          {running ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button
          onClick={() => switchMode(mode === 'pomodoro' ? 'short' : 'pomodoro')}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          title="跳过"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7M15 5v14"/>
          </svg>
        </button>
      </div>

      {/* Link task */}
      <div className="mx-4 mb-4 relative">
        <button
          onClick={() => setShowLinkMenu(m => !m)}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
            linkedTodo
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span className="truncate flex-1 text-left">
            {linkedTodo ? linkedTodo.title : '关联任务…'}
          </span>
          {linkedTodo && (
            <button
              onClick={e => { e.stopPropagation(); onLinkTodo(null); }}
              className="p-0.5 rounded hover:bg-indigo-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </button>

        {showLinkMenu && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden z-50 animate-scale-in max-h-52 overflow-y-auto">
            {todos.filter(t => !t.completed).length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400">暂无待办任务</p>
            ) : (
              todos.filter(t => !t.completed).map(t => (
                <button
                  key={t.id}
                  onClick={() => { onLinkTodo(t.id); setShowLinkMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${linkedTodoId === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${['bg-red-500','bg-orange-400','bg-blue-400','bg-slate-300'][t.priority - 1]}`}/>
                  <span className="truncate">{t.title}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mx-4 mb-4 p-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100/60">
        <div className="text-xs font-semibold text-indigo-700 mb-2">今日统计</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-xl font-bold text-indigo-600 tabular-nums">{pomodoros}</div>
            <div className="text-[11px] text-indigo-400">番茄数</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600 tabular-nums">{pomodoros * 25}</div>
            <div className="text-[11px] text-purple-400">专注分钟</div>
          </div>
        </div>
      </div>
    </div>
  );
}
