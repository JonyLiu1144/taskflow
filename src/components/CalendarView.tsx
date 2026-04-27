'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Todo, TodoList, Priority } from '@/types/todo';

interface Props {
  todos: Todo[];
  lists: TodoList[];
  onAddTodo: (title: string, listId: string, priority: Priority, dueDate: string | null, startTime?: string | null, endTime?: string | null) => void;
  onToggleTodo: (id: string) => void;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const PRIORITY_COLOR: Record<Priority, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#3b82f6', 4: '#94a3b8',
};
const HOUR_START = 7;
const HOUR_END   = 23;
const HOUR_H     = 64; // px per hour

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function snapMin(raw: number) {
  return Math.round(raw / 30) * 30;
}

function buildGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const offset   = firstDay === 0 ? 6 : firstDay - 1;
  const inMonth  = new Date(year, month + 1, 0).getDate();
  const inPrev   = new Date(year, month, 0).getDate();
  const cells: { date: string; day: number; current: boolean }[] = [];
  for (let i = offset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, inPrev - i);
    cells.push({ date: toDateStr(d), day: inPrev - i, current: false });
  }
  for (let i = 1; i <= inMonth; i++) {
    const d = new Date(year, month, i);
    cells.push({ date: toDateStr(d), day: i, current: true });
  }
  const rem = 42 - cells.length;
  for (let i = 1; i <= rem; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({ date: toDateStr(d), day: i, current: false });
  }
  return cells;
}

function datesBetween(a: string, b: string) {
  const set = new Set<string>();
  const start = new Date(a < b ? a : b);
  const end   = new Date(a < b ? b : a);
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1))
    set.add(toDateStr(new Date(d)));
  return set;
}

interface Popover {
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  x: number;
  y: number;
}

export default function CalendarView({ todos, lists, onAddTodo, onToggleTodo }: Props) {
  const todayStr = useMemo(() => toDateStr(new Date()), []);

  const [mode,     setMode    ] = useState<'month' | 'week'>('month');
  const [anchor,   setAnchor  ] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selected, setSelected] = useState(todayStr);

  // Month drag
  const [mDragStart, setMDragStart] = useState<string | null>(null);
  const [mDragEnd,   setMDragEnd  ] = useState<string | null>(null);
  const mDragging = useRef(false);

  // Week drag
  const [wDrag, setWDrag] = useState<{ date: string; startMin: number; endMin: number } | null>(null);
  const wDragging = useRef(false);
  const wGridRef  = useRef<HTMLDivElement>(null);
  const wDragDate = useRef<string>('');

  // Popover
  const [popover,       setPopover      ] = useState<Popover | null>(null);
  const [createTitle,   setCreateTitle  ] = useState('');
  const [createListId,  setCreateListId ] = useState(() => lists[0]?.id ?? '');
  const [createPriority,setCreatePriority] = useState<Priority>(4);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (popover) setTimeout(() => inputRef.current?.focus(), 30); }, [popover]);
  useEffect(() => { setCreateListId(lists[0]?.id ?? ''); }, [lists]);

  const year  = anchor.getFullYear();
  const month = anchor.getMonth();
  const grid  = useMemo(() => buildGrid(year, month), [year, month]);

  const weekDays = useMemo(() => {
    const d = new Date(selected + 'T12:00:00');
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    return Array.from({ length: 7 }, (_, i) => {
      const nd = new Date(d);
      nd.setDate(d.getDate() - dow + i);
      return toDateStr(nd);
    });
  }, [selected]);

  const byDate = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    todos.forEach(t => { if (t.dueDate) (map[t.dueDate] ??= []).push(t); });
    return map;
  }, [todos]);

  function chipColor(t: Todo) {
    const list = lists.find(l => l.id === t.listId);
    return list?.color ?? PRIORITY_COLOR[t.priority];
  }

  function openPopover(startDate: string, endDate: string, startTime: string | null, endTime: string | null, x: number, y: number) {
    const px = Math.min(x + 8, window.innerWidth - 310);
    const py = Math.min(y + 8, window.innerHeight - 240);
    setPopover({ startDate, endDate, startTime, endTime, x: px, y: py });
    setCreateTitle('');
    setCreatePriority(4);
  }

  function submitCreate() {
    if (!popover || !createTitle.trim()) return;
    onAddTodo(createTitle.trim(), createListId, createPriority, popover.endDate, popover.startTime, popover.endTime);
    setPopover(null);
    setCreateTitle('');
  }

  function cancelCreate() {
    setPopover(null);
    setWDrag(null);
    setMDragStart(null);
    setMDragEnd(null);
    mDragging.current = false;
    wDragging.current = false;
  }

  /* ── Month drag ── */
  function onMonthCellDown(e: React.MouseEvent, date: string) {
    if (e.button !== 0) return;
    mDragging.current = true;
    setMDragStart(date);
    setMDragEnd(date);
  }
  function onMonthCellEnter(date: string) {
    if (!mDragging.current) return;
    setMDragEnd(date);
  }
  function onMonthCellUp(e: React.MouseEvent, date: string) {
    if (!mDragging.current) return;
    mDragging.current = false;
    const start = mDragStart ?? date;
    const end   = mDragEnd   ?? date;
    setMDragStart(null);
    setMDragEnd(null);
    openPopover(start < end ? start : end, start < end ? end : start, null, null, e.clientX, e.clientY);
  }

  /* ── Week drag (time slots) ── */
  const getMinFromY = useCallback((clientY: number) => {
    if (!wGridRef.current) return HOUR_START * 60;
    const rect = wGridRef.current.getBoundingClientRect();
    const relY  = clientY - rect.top;
    const raw   = HOUR_START * 60 + (relY / HOUR_H) * 60;
    return Math.max(HOUR_START * 60, Math.min(HOUR_END * 60, snapMin(raw)));
  }, []);

  function onWeekColDown(e: React.MouseEvent, date: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    wDragging.current = true;
    wDragDate.current = date;
    const startMin = getMinFromY(e.clientY);
    setWDrag({ date, startMin, endMin: startMin + 60 });
  }

  function onWeekGridMove(e: React.MouseEvent) {
    if (!wDragging.current || !wDrag) return;
    const endMin = getMinFromY(e.clientY);
    setWDrag(prev => prev ? { ...prev, endMin: Math.max(prev.startMin + 30, endMin) } : null);
  }

  function onWeekGridUp(e: React.MouseEvent) {
    if (!wDragging.current || !wDrag) return;
    wDragging.current = false;
    const { date, startMin, endMin } = wDrag;
    setWDrag(null);
    openPopover(date, date, minToTime(startMin), minToTime(endMin), e.clientX, e.clientY);
  }

  /* ── Selected-day panel ── */
  const selectedTodos = byDate[selected] ?? [];

  /* ── Month view ── */
  const mDragRange = mDragStart && mDragEnd ? datesBetween(mDragStart, mDragEnd) : null;

  const MonthGrid = (
    <div
      className="flex-1 flex flex-col min-w-0 overflow-hidden select-none"
      onMouseLeave={() => { if (mDragging.current) { mDragging.current = false; setMDragStart(null); setMDragEnd(null); } }}
    >
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
        {grid.map(cell => {
          const isToday  = cell.date === todayStr;
          const isSel    = cell.date === selected;
          const inDrag   = mDragRange?.has(cell.date) ?? false;
          const dayTodos = byDate[cell.date] ?? [];
          const shown    = dayTodos.slice(0, 3);
          const extra    = dayTodos.length - 3;
          return (
            <div
              key={cell.date}
              className={`border-b border-r border-slate-100/80 p-1.5 overflow-hidden transition-colors cursor-crosshair
                ${inDrag ? 'bg-indigo-100/60' : isSel ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}
              `}
              onMouseDown={e => onMonthCellDown(e, cell.date)}
              onMouseEnter={() => { onMonthCellEnter(cell.date); if (!mDragging.current) setSelected(cell.date); }}
              onMouseUp={e => onMonthCellUp(e, cell.date)}
            >
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-semibold mb-1 mx-auto transition-colors ${
                isToday ? 'bg-indigo-500 text-white shadow-sm' : isSel ? 'bg-indigo-100 text-indigo-700' : cell.current ? 'text-slate-700' : 'text-slate-300'
              }`}>
                {cell.day}
              </div>
              {shown.map(t => (
                <div key={t.id}
                  className={`text-[10px] px-1.5 py-[2px] rounded mb-[2px] truncate font-medium ${t.completed ? 'opacity-35 line-through' : ''}`}
                  style={{ background: `${chipColor(t)}1a`, color: chipColor(t) }}
                  title={t.title}
                >
                  {t.startTime && <span className="mr-1 opacity-70">{t.startTime}</span>}
                  {t.title}
                </div>
              ))}
              {extra > 0 && <div className="text-[10px] text-slate-400 pl-1">+{extra}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ── Week view ── */
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const totalH = (HOUR_END - HOUR_START) * HOUR_H;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nowTop = ((nowMin - HOUR_START * 60) / 60) * HOUR_H;

  const WeekGrid = (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b border-slate-100 bg-slate-50/60" style={{ gridTemplateColumns: '48px repeat(7,1fr)' }}>
        <div />
        {weekDays.map(date => {
          const d = new Date(date + 'T12:00:00');
          const isToday = date === todayStr;
          const isSel   = date === selected;
          return (
            <div key={date} onClick={() => setSelected(date)}
              className={`py-3 text-center cursor-pointer transition-colors ${isSel ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-1">
                {WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}
              </div>
              <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold ${
                isToday ? 'bg-indigo-500 text-white' : isSel ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700'
              }`}>
                {d.getDate()}
              </div>
              {(byDate[date] ?? []).length > 0 && <div className="w-1 h-1 rounded-full bg-indigo-400 mx-auto mt-1" />}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div
          ref={wGridRef}
          className="relative grid select-none"
          style={{ gridTemplateColumns: '48px repeat(7,1fr)', height: totalH }}
          onMouseMove={onWeekGridMove}
          onMouseUp={onWeekGridUp}
          onMouseLeave={() => { if (wDragging.current) { wDragging.current = false; setWDrag(null); } }}
        >
          {/* Hour lines + labels */}
          {hours.map(h => (
            <div key={h} className="absolute left-0 right-0 flex items-start pointer-events-none"
              style={{ top: (h - HOUR_START) * HOUR_H }}>
              <div className="w-12 text-[10px] text-slate-300 text-right pr-2 -mt-2">{h}:00</div>
              <div className="flex-1 border-t border-slate-100" />
            </div>
          ))}

          {/* Half-hour lines */}
          {hours.map(h => (
            <div key={`${h}h`} className="absolute left-12 right-0 border-t border-slate-50 pointer-events-none"
              style={{ top: (h - HOUR_START) * HOUR_H + HOUR_H / 2 }} />
          ))}

          {/* Now indicator */}
          {nowMin >= HOUR_START * 60 && nowMin <= HOUR_END * 60 && (
            <div className="absolute left-12 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowTop }}>
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
              <div className="flex-1 h-px bg-red-400" />
            </div>
          )}

          {/* Day columns */}
          {weekDays.map((date, colIdx) => {
            const colTodos = (byDate[date] ?? []).filter(t => t.startTime);
            const isDragCol = wDrag?.date === date;
            const dragTop = wDrag ? ((Math.min(wDrag.startMin, wDrag.endMin) - HOUR_START * 60) / 60) * HOUR_H : 0;
            const dragH   = wDrag ? (Math.abs(wDrag.endMin - wDrag.startMin) / 60) * HOUR_H : 0;

            return (
              <div
                key={date}
                className={`absolute top-0 bottom-0 border-l border-slate-100 cursor-crosshair
                  ${date === selected ? 'bg-indigo-50/30' : ''}
                `}
                style={{ left: `calc(48px + ${colIdx} * ((100% - 48px) / 7))`, width: 'calc((100% - 48px) / 7)' }}
                onMouseDown={e => onWeekColDown(e, date)}
              >
                {/* Drag selection */}
                {isDragCol && dragH > 0 && (
                  <div className="absolute left-1 right-1 rounded-lg bg-indigo-400/25 border border-indigo-400/60 pointer-events-none z-10 flex flex-col justify-start overflow-hidden"
                    style={{ top: dragTop, height: dragH }}>
                    <span className="text-[10px] font-semibold text-indigo-600 px-1.5 pt-1">
                      {minToTime(Math.min(wDrag!.startMin, wDrag!.endMin))} – {minToTime(Math.max(wDrag!.startMin, wDrag!.endMin))}
                    </span>
                  </div>
                )}

                {/* Tasks with time */}
                {colTodos.map(t => {
                  const start = timeToMin(t.startTime!);
                  const end   = t.endTime ? timeToMin(t.endTime) : start + 60;
                  const top   = ((start - HOUR_START * 60) / 60) * HOUR_H;
                  const h     = Math.max(24, ((end - start) / 60) * HOUR_H);
                  const color = chipColor(t);
                  return (
                    <div key={t.id}
                      className={`absolute left-1 right-1 rounded-lg px-1.5 py-1 overflow-hidden z-10 cursor-pointer hover:opacity-80 transition-opacity ${t.completed ? 'opacity-40' : ''}`}
                      style={{ top, height: h, background: `${color}1a`, borderLeft: `3px solid ${color}` }}
                    >
                      <p className="text-[10px] font-semibold leading-tight truncate" style={{ color }}>{t.title}</p>
                      {h > 32 && <p className="text-[9px] opacity-60 mt-0.5" style={{ color }}>{t.startTime}–{t.endTime ?? ''}</p>}
                    </div>
                  );
                })}

                {/* All-day tasks (no startTime) at top */}
                {(byDate[date] ?? []).filter(t => !t.startTime).map((t, i) => {
                  const color = chipColor(t);
                  return (
                    <div key={t.id}
                      className={`absolute left-1 right-1 h-5 rounded px-1.5 flex items-center overflow-hidden ${t.completed ? 'opacity-40 line-through' : ''}`}
                      style={{ top: i * 22, background: `${color}1a`, color }}
                    >
                      <span className="text-[10px] font-medium truncate">{t.title}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="flex-1 flex min-w-0 overflow-hidden bg-white" onMouseUp={() => { mDragging.current = false; }}>
      {/* Main calendar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100 shrink-0">
          <h1 className="font-bold text-xl text-slate-800 tabular-nums min-w-[5rem]">{year}年{month + 1}月</h1>
          <button onClick={() => { setAnchor(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelected(todayStr); }}
            className="px-3 py-1 text-xs font-semibold bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
            今天
          </button>
          <div className="flex gap-1">
            <button onClick={() => setAnchor(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={() => setAnchor(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <div className="text-xs text-slate-400 ml-1">
            {mode === 'month' ? '拖拽日期格创建任务' : '拖拽时间轴创建任务'}
          </div>
          <div className="ml-auto flex gap-1 p-1 bg-slate-100 rounded-xl">
            {(['month', 'week'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {m === 'month' ? '月' : '周'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'month' ? MonthGrid : WeekGrid}
      </div>

      {/* Right panel */}
      <div className="w-60 shrink-0 border-l border-slate-100 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="text-sm font-bold text-slate-800">
            {selected === todayStr ? '今天' : (() => { const d = new Date(selected + 'T12:00:00'); return `${d.getMonth()+1}月${d.getDate()}日`; })()}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{selectedTodos.length > 0 ? `${selectedTodos.length} 个任务` : '暂无任务'}</div>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          {selectedTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-300 gap-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p className="text-xs">无任务</p>
            </div>
          ) : (
            <div className="space-y-2 px-3">
              {selectedTodos.map(t => {
                const list  = lists.find(l => l.id === t.listId);
                const color = chipColor(t);
                return (
                  <div key={t.id} className="p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-colors"
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
                    <div className="flex items-start gap-2">
                      <button onClick={() => onToggleTodo(t.id)}
                        className="mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                        style={{ borderColor: t.completed ? color : `${color}60`, backgroundColor: t.completed ? color : undefined }}>
                        {t.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-snug ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</p>
                        {(t.startTime || t.endTime) && (
                          <p className="text-[10px] mt-0.5 font-mono" style={{ color }}>
                            {t.startTime}{t.endTime ? ` – ${t.endTime}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {list && (
                      <div className="flex items-center gap-1 mt-1.5 ml-6">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: list.color }}/>
                        <span className="text-[10px] text-slate-400">{list.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Creation popover */}
      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={cancelCreate} />
          <div
            className="fixed z-50 w-72 bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-100 p-4 animate-scale-in"
            style={{ left: popover.x, top: popover.y }}
            onClick={e => e.stopPropagation()}
          >
            {/* Date/time info */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-lg text-xs font-medium text-indigo-600">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                {popover.startDate === popover.endDate ? popover.startDate : `${popover.startDate} → ${popover.endDate}`}
              </div>
              {popover.startTime && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-lg text-xs font-mono font-medium text-emerald-600">
                  {popover.startTime} – {popover.endTime}
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitCreate(); if (e.key === 'Escape') cancelCreate(); }}
              placeholder="任务名称…"
              className="w-full text-sm font-medium text-slate-800 outline-none border-b border-slate-200 pb-2 mb-3 placeholder-slate-300"
            />

            <div className="flex items-center gap-2 mb-3">
              <select value={createPriority} onChange={e => setCreatePriority(Number(e.target.value) as Priority)}
                className="text-xs bg-slate-100 border-none outline-none rounded-lg px-2 py-1.5 text-slate-600 cursor-pointer">
                <option value={1}>🔴 紧急</option>
                <option value={2}>🟠 高</option>
                <option value={3}>🔵 中</option>
                <option value={4}>⚪ 低</option>
              </select>
              <select value={createListId} onChange={e => setCreateListId(e.target.value)}
                className="text-xs bg-slate-100 border-none outline-none rounded-lg px-2 py-1.5 text-slate-600 cursor-pointer flex-1">
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={cancelCreate} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">取消</button>
              <button onClick={submitCreate}
                className="px-4 py-1.5 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium shadow-sm">
                创建
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
