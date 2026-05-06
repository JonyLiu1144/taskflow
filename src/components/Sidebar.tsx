'use client';

import { useState } from 'react';
import { Todo, TodoList, ViewFilter } from '@/types/todo';

const LIST_COLORS = [
  '#6366f1','#f97316','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#ec4899','#06b6d4',
];

interface Props {
  lists: TodoList[];
  todos: Todo[];
  selectedView: ViewFilter;
  onSelectView: (v: ViewFilter) => void;
  onAddList: (name: string, color: string) => void;
  onDeleteList: (id: string) => void;
  showTimer: boolean;
  onToggleTimer: () => void;
  onSignOut: () => void;
}

export default function Sidebar({
  lists, todos, selectedView, onSelectView,
  onAddList, onDeleteList, showTimer, onToggleTimer, onSignOut,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName]       = useState('');
  const [color, setColor]     = useState(LIST_COLORS[0]);
  const [hovered, setHovered] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const smartViews = [
    { id: 'inbox',     label: '收件箱',   icon: '📥', count: todos.filter(t => !t.completed).length },
    { id: 'today',     label: '今天',     icon: '☀️', count: todos.filter(t => !t.completed && t.dueDate === today).length },
    { id: 'upcoming',  label: '即将到来', icon: '📅', count: todos.filter(t => !t.completed && t.dueDate && t.dueDate > today).length },
    { id: 'calendar',  label: '日历',     icon: '🗓️', count: 0 },
    { id: 'completed', label: '已完成',   icon: '✅', count: todos.filter(t => t.completed).length },
  ];

  function submit() {
    if (!name.trim()) return;
    onAddList(name.trim(), color);
    setName('');
    setShowAdd(false);
  }

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white select-none">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 text-sm">
          ⚡
        </div>
        <span className="font-bold text-[17px] tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          TaskFlow
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-2">
        {smartViews.map(v => (
          <button
            key={v.id}
            onClick={() => onSelectView(v.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              selectedView === v.id
                ? 'bg-indigo-500/25 text-white ring-1 ring-indigo-500/30'
                : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
            }`}
          >
            <span className="text-[15px] leading-none">{v.icon}</span>
            <span className="flex-1 text-left">{v.label}</span>
            {v.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                selectedView === v.id ? 'bg-indigo-500/40 text-indigo-200' : 'bg-white/10 text-slate-400'
              }`}>
                {v.count}
              </span>
            )}
          </button>
        ))}

        <div className="pt-5 pb-2 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">我的清单</span>
        </div>

        {lists.map(list => {
          const cnt = todos.filter(t => t.listId === list.id && !t.completed).length;
          return (
            <div
              key={list.id}
              className="relative"
              onMouseEnter={() => setHovered(list.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                onClick={() => onSelectView(list.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  selectedView === list.id
                    ? 'bg-white/12 text-white'
                    : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                <span className="flex-1 text-left truncate">{list.name}</span>
                {cnt > 0 && <span className="text-xs text-slate-500 tabular-nums">{cnt}</span>}
              </button>
              {hovered === list.id && (
                <button
                  onClick={e => { e.stopPropagation(); onDeleteList(list.id); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 text-slate-600 hover:text-red-400 transition-colors animate-fade-in"
                  title="删除清单"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}

        {/* Add list */}
        {showAdd ? (
          <div className="px-1 py-2 animate-slide-down">
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setShowAdd(false); }}
              placeholder="清单名称…"
              className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400/60 mb-2"
            />
            <div className="flex gap-1.5 flex-wrap mb-2.5">
              {LIST_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110 shrink-0"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? '2px solid white' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={submit}
                className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white text-xs py-1.5 rounded-lg transition-colors font-medium"
              >创建</button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 text-slate-400 hover:text-white text-xs py-1.5 rounded-lg hover:bg-white/8 transition-colors"
              >取消</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-500 hover:text-slate-300 hover:bg-white/8 rounded-xl text-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            新建清单
          </button>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-white/8">
        <button
          onClick={onToggleTimer}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            showTimer
              ? 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-500/30'
              : 'text-slate-500 hover:bg-white/8 hover:text-slate-300'
          }`}
        >
          <span className="text-[15px]">🍅</span>
          <span>番茄钟</span>
          {showTimer && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse-ring" />}
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-white/8 hover:text-slate-300 transition-all duration-150 mt-1"
        >
          <span className="text-[15px]">🚪</span>
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}
