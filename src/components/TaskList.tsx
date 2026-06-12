'use client';

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Todo, TodoList, ViewFilter, Priority, Milestone } from '@/types/todo';
import CelebrationToast from './CelebrationToast';
import TimeStats from './TimeStats';
import DailyBadges from './DailyBadges';

/* ── helpers ── */
function genId() { return Math.random().toString(36).slice(2, 11); }

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hhmm = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isToday) return `今天 ${hhmm}`;
  if (isYesterday) return `昨天 ${hhmm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hhmm}`;
}

function formatTimeChinese(s: number): string {
  if (s <= 0) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}小时${m > 0 ? ` ${m}分` : ''}`;
  if (m > 0) return `${m}分${sec > 0 ? ` ${sec}秒` : ''}`;
  return `${sec}秒`;
}

const PRIORITY_CFG: Record<Priority, {
  label: string; dot: string; ring: string; text: string;
  accent: string; badgeBg: string; badgeText: string;
  cardGlow: string; checkColor: string;
}> = {
  1: {
    label: '紧急', dot: 'bg-red-500', ring: 'border-red-400', text: 'text-red-500',
    accent: 'linear-gradient(180deg,#f87171,#dc2626)',
    badgeBg: 'bg-red-500/10', badgeText: 'text-red-500',
    cardGlow: '0 4px 20px rgba(239,68,68,0.1)', checkColor: '#ef4444',
  },
  2: {
    label: '高', dot: 'bg-orange-400', ring: 'border-orange-400', text: 'text-orange-500',
    accent: 'linear-gradient(180deg,#fb923c,#ea580c)',
    badgeBg: 'bg-orange-500/10', badgeText: 'text-orange-500',
    cardGlow: '0 4px 20px rgba(249,115,22,0.1)', checkColor: '#f97316',
  },
  3: {
    label: '中', dot: 'bg-blue-400', ring: 'border-blue-400', text: 'text-blue-500',
    accent: 'linear-gradient(180deg,#60a5fa,#2563eb)',
    badgeBg: 'bg-blue-500/10', badgeText: 'text-blue-600',
    cardGlow: '0 4px 20px rgba(59,130,246,0.08)', checkColor: '#3b82f6',
  },
  4: {
    label: '低', dot: 'bg-slate-300', ring: 'border-slate-300', text: 'text-slate-400',
    accent: 'linear-gradient(180deg,#cbd5e1,#94a3b8)',
    badgeBg: 'bg-slate-200/60', badgeText: 'text-slate-500',
    cardGlow: '0 2px 12px rgba(0,0,0,0.05)', checkColor: '#94a3b8',
  },
};

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return dueDate < new Date().toISOString().split('T')[0];
}
function isToday(dueDate: string | null) {
  return dueDate === new Date().toISOString().split('T')[0];
}

/* ── inline edit row ── */
interface EditRowProps {
  todo: Todo;
  lists: TodoList[];
  onSave: (updates: Partial<Todo>) => void;
  onCancel: () => void;
}
export interface EditRowHandle {
  save: () => void;
}
const EditRow = forwardRef<EditRowHandle, EditRowProps>(function EditRow({ todo, lists, onSave, onCancel }, ref) {
  const [title, setTitle]             = useState(todo.title);
  const [priority, setPriority]       = useState<Priority>(todo.priority);
  const [dueDate, setDueDate]         = useState(todo.dueDate ?? '');
  const [listId, setListId]           = useState(todo.listId);
  const [desc, setDesc]               = useState(todo.description);
  const [showSubs, setShowSubs]       = useState(false);
  const [subtasks, setSubtasks]       = useState(todo.subtasks);
  const [subInput, setSubInput]       = useState('');
  const [showMilestones, setShowMilestones] = useState(true);
  const [milestones, setMilestones]   = useState<Milestone[]>(todo.milestones ?? []);
  const [msInput, setMsInput]         = useState('');
  const [msDate, setMsDate]           = useState('');

  // Expose save() so parent can trigger auto-save on click-outside
  useImperativeHandle(ref, () => ({
    save: () => onSave({ title, priority, dueDate: dueDate || null, listId, description: desc, subtasks, milestones }),
  }), [title, priority, dueDate, listId, desc, subtasks, milestones, onSave]);

  function addSub() {
    if (!subInput.trim()) return;
    setSubtasks(prev => [...prev, { id: genId(), title: subInput.trim(), completed: false }]);
    setSubInput('');
  }

  function addMilestone() {
    if (!msInput.trim()) return;
    setMilestones(prev => [...prev, { id: genId(), title: msInput.trim(), date: msDate || null, completed: false }]);
    setMsInput('');
    setMsDate('');
  }

  return (
    <div className="mx-4 mb-2 bg-white rounded-2xl border border-indigo-200 shadow-lg shadow-indigo-100/40 p-4 animate-scale-in">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        className="w-full text-sm font-medium text-slate-800 outline-none border-b border-slate-200 pb-2 mb-3"
        placeholder="任务标题…"
      />
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        className="w-full text-xs text-slate-500 outline-none resize-none mb-3 min-h-[40px]"
        placeholder="备注…"
        rows={2}
      />

      <div className="flex flex-wrap gap-2 mb-3">
        {/* Priority */}
        <select
          value={priority}
          onChange={e => setPriority(Number(e.target.value) as Priority)}
          className="text-xs bg-slate-100 border-none outline-none rounded-lg px-2.5 py-1.5 text-slate-600 cursor-pointer"
        >
          <option value={1}>🔴 紧急</option>
          <option value={2}>🟠 高</option>
          <option value={3}>🔵 中</option>
          <option value={4}>⚪ 低</option>
        </select>

        {/* Due date */}
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="text-xs bg-slate-100 border-none outline-none rounded-lg px-2.5 py-1.5 text-slate-600 cursor-pointer"
        />

        {/* List */}
        <select
          value={listId}
          onChange={e => setListId(e.target.value)}
          className="text-xs bg-slate-100 border-none outline-none rounded-lg px-2.5 py-1.5 text-slate-600 cursor-pointer"
        >
          {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        {/* Subtasks toggle */}
        <button
          onClick={() => setShowSubs(s => !s)}
          className="text-xs bg-slate-100 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          📋 子任务 {subtasks.length > 0 && `(${subtasks.filter(s => s.completed).length}/${subtasks.length})`}
        </button>

        {/* Milestones toggle */}
        <button
          onClick={() => setShowMilestones(s => !s)}
          className="text-xs bg-slate-100 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          🏁 里程碑 {milestones.length > 0 && `(${milestones.filter(m => m.completed).length}/${milestones.length})`}
        </button>
      </div>

      {showSubs && (
        <div className="mb-3 space-y-1.5 animate-slide-down">
          {subtasks.map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.completed}
                onChange={() => setSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, completed: !x.completed } : x))}
                className="w-3.5 h-3.5 rounded accent-indigo-500"
              />
              <span className={`text-xs flex-1 ${s.completed ? 'line-through text-slate-400' : 'text-slate-600'}`}>{s.title}</span>
              <button
                onClick={() => setSubtasks(prev => prev.filter(x => x.id !== s.id))}
                className="text-slate-300 hover:text-red-400 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input
              value={subInput}
              onChange={e => setSubInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSub(); }}
              placeholder="添加子任务…"
              className="flex-1 text-xs bg-slate-100 rounded-lg px-2.5 py-1.5 outline-none text-slate-600 placeholder-slate-400"
            />
            <button onClick={addSub} className="text-xs bg-indigo-500 text-white rounded-lg px-2.5 hover:bg-indigo-600 transition-colors">+</button>
          </div>
        </div>
      )}

      {/* ── Milestones editor ── */}
      {showMilestones && (
        <div className="mb-3 animate-slide-down">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">里程碑时间线</div>
          {milestones.length > 0 && (
            <div className="relative ml-1 mb-3">
              {/* vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={m.id} className="flex items-start gap-3 relative">
                    {/* dot */}
                    <button
                      onClick={() => setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, completed: !x.completed } : x))}
                      className={`relative z-10 mt-1.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-all ${
                        m.completed ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-300 hover:border-indigo-400'
                      }`}
                    >
                      {m.completed && (
                        <svg className="w-2 h-2 text-white absolute inset-0 m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      )}
                    </button>
                    {/* Inline editable title + date */}
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <input
                        value={m.title}
                        onChange={e => setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, title: e.target.value } : x))}
                        className={`flex-1 text-xs bg-transparent outline-none border-b border-transparent hover:border-slate-200 focus:border-indigo-300 transition-colors py-0.5 ${
                          m.completed ? 'line-through text-slate-400' : 'text-slate-700'
                        }`}
                      />
                      <input
                        type="date"
                        value={m.date ?? ''}
                        onChange={e => setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, date: e.target.value || null } : x))}
                        className="text-[10px] bg-transparent border-none outline-none text-slate-400 cursor-pointer w-28 shrink-0"
                      />
                    </div>
                    <button
                      onClick={() => setMilestones(prev => prev.filter((_, j) => j !== i))}
                      className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Add milestone input */}
          <div className="flex gap-1.5 items-center">
            <input
              value={msInput}
              onChange={e => setMsInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addMilestone(); }}
              placeholder="里程碑名称…"
              className="flex-1 text-xs bg-slate-100 rounded-lg px-2.5 py-1.5 outline-none text-slate-600 placeholder-slate-400"
            />
            <input
              type="date"
              value={msDate}
              onChange={e => setMsDate(e.target.value)}
              className="text-xs bg-slate-100 border-none outline-none rounded-lg px-2 py-1.5 text-slate-600 cursor-pointer"
            />
            <button onClick={addMilestone} className="text-xs bg-indigo-500 text-white rounded-lg px-2.5 py-1.5 hover:bg-indigo-600 transition-colors shrink-0">+</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >取消</button>
        <button
          onClick={() => onSave({ title, priority, dueDate: dueDate || null, listId, description: desc, subtasks, milestones })}
          className="px-4 py-1.5 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium shadow-sm"
        >保存</button>
      </div>
    </div>
  );
});

/* ── drop indicator ── */
function DropLine() {
  return (
    <div className="mx-5 my-0.5 h-[3px] rounded-full bg-indigo-500 animate-fade-in"
      style={{ boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
  );
}

/* ── single task item ── */
interface ItemProps {
  todo: Todo;
  lists: TodoList[];
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  timerLinked: boolean;
  isDragging: boolean;
  editRowRef?: React.Ref<EditRowHandle>;
  onClick: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Todo>) => void;
  onEditEnd: () => void;
  onToggleTracking: () => void;
  onLinkTimer: () => void;
}

function TaskItem({
  todo, lists, index, isSelected, isEditing, timerLinked, isDragging,
  editRowRef,
  onClick, onToggle, onDelete, onUpdate, onEditEnd,
  onToggleTracking, onLinkTimer,
}: ItemProps) {
  const [bouncing, setBouncing]       = useState(false);
  const [flashing, setFlashing]       = useState(false);
  const [descEditing, setDescEditing] = useState(false);
  const [descValue, setDescValue]     = useState(todo.description);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subInput, setSubInput]       = useState('');
  const subInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const cfg  = PRIORITY_CFG[todo.priority];
  const list = lists.find(l => l.id === todo.listId);

  // Keep local desc in sync when edited from parent (full edit modal)
  useEffect(() => {
    if (!descEditing) setDescValue(todo.description);
  }, [todo.description, descEditing]);

  useEffect(() => {
    if (descEditing) {
      descRef.current?.focus();
      const len = descRef.current?.value.length ?? 0;
      descRef.current?.setSelectionRange(len, len);
    }
  }, [descEditing]);

  useEffect(() => {
    if (addingSubtask) subInputRef.current?.focus();
  }, [addingSubtask]);

  function submitSubtask() {
    if (!subInput.trim()) { setAddingSubtask(false); return; }
    onUpdate({ subtasks: [...todo.subtasks, { id: genId(), title: subInput.trim(), completed: false }] });
    setSubInput('');
    subInputRef.current?.focus();
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setBouncing(true);
    setTimeout(() => setBouncing(false), 400);
    if (!todo.completed) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 700);
    }
    onToggle();
  }

  function saveDesc() {
    setDescEditing(false);
    if (descValue.trim() !== todo.description) {
      onUpdate({ description: descValue.trim() });
    }
  }

  const completedSubs = todo.subtasks.filter(s => s.completed).length;
  const hasTime = todo.timeSpent > 0 || todo.isTracking;

  if (isEditing) {
    return (
      <EditRow
        ref={editRowRef}
        todo={todo}
        lists={lists}
        onSave={updates => { onUpdate(updates); onEditEnd(); }}
        onCancel={onEditEnd}
      />
    );
  }

  const cardShadow = isSelected
    ? `0 0 0 2px ${cfg.checkColor}40, 0 8px 24px ${cfg.checkColor}18`
    : `${cfg.cardGlow}, -3px 0 0 0 ${cfg.checkColor}`;

  return (
    <div
      className={`task-card task-item group relative mx-4 mb-1.5 flex overflow-hidden rounded-xl cursor-pointer
        bg-white border border-slate-200
        ${todo.isTracking ? '!border-emerald-300' : ''}
        ${todo.completed ? 'opacity-50' : ''}
        ${flashing ? 'animate-task-flash' : ''}
        ${isDragging ? 'opacity-25 scale-95 !shadow-none pointer-events-none' : ''}
        ${todo.priority === 1 ? 'task-card-urgent' : ''}
      `}
      style={{ boxShadow: isDragging ? 'none' : todo.isTracking ? `0 0 0 2px rgba(52,211,153,0.25), 0 4px 20px rgba(52,211,153,0.12), ${cfg.cardGlow}` : cardShadow }}
      onClick={onClick}
    >
      {/* ── Gradient accent bar ── */}
      <div className="w-[3px] shrink-0 self-stretch" style={{ background: cfg.accent }} />

      {/* ── Card body ── */}
      <div className="relative flex flex-1 min-w-0 gap-2 px-3 py-2 pr-8">

        {/* Drag grip + index */}
        <div className="self-start mt-0.5 shrink-0 flex flex-col items-center gap-0.5 -ml-1.5">
          <div
            data-drag-handle
            className="opacity-0 group-hover:opacity-100 transition-opacity
            text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="5.5" cy="3.5" r="1.3"/><circle cx="10.5" cy="3.5" r="1.3"/>
              <circle cx="5.5" cy="8"   r="1.3"/><circle cx="10.5" cy="8"   r="1.3"/>
              <circle cx="5.5" cy="12.5" r="1.3"/><circle cx="10.5" cy="12.5" r="1.3"/>
            </svg>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-400 group-hover:opacity-0 transition-opacity leading-none select-none">
            {index}
          </span>
        </div>

        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-all duration-200 flex items-center justify-center ${
            bouncing ? 'animate-check-bounce' : ''
          }`}
          style={{
            borderColor: todo.completed ? cfg.checkColor : undefined,
            backgroundColor: todo.completed ? cfg.checkColor : undefined,
            borderWidth: todo.completed ? 0 : undefined,
          }}
        >
          {todo.completed
            ? <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
            : <span className="w-full h-full rounded-full border-2 block"
                style={{ borderColor: `${cfg.checkColor}60` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.checkColor)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = `${cfg.checkColor}60`)}
              />
          }
        </button>

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-1">

          {/* Title + priority badge */}
          <div className="flex items-start gap-2">
            <span className={`flex-1 text-[13px] font-semibold leading-snug tracking-tight ${
              todo.completed ? 'line-through text-slate-400' : 'text-slate-800'
            }`}>
              {todo.title}
            </span>
            {todo.priority !== 4 && (
              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wide ${cfg.badgeBg} ${cfg.badgeText}`}>
                {cfg.label}
              </span>
            )}
          </div>

          {/* ── Notes ── */}
          <div
            onClick={e => { e.stopPropagation(); if (!todo.completed) setDescEditing(true); }}
          >
            {descEditing ? (
              <textarea
                ref={descRef}
                value={descValue}
                rows={2}
                onChange={e => setDescValue(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setDescValue(todo.description); setDescEditing(false); }
                }}
                onClick={e => e.stopPropagation()}
                placeholder="添加备注…"
                className="w-full text-xs text-slate-600 bg-slate-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 resize-none outline-none focus:ring-2 focus:ring-indigo-200/50 focus:bg-white transition-all animate-slide-down"
              />
            ) : todo.description ? (
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 hover:line-clamp-none transition-all border-l-2 border-slate-100 pl-2">
                {todo.description}
              </p>
            ) : null}
          </div>

          {/* ── Subtasks ── */}
          {todo.subtasks.length > 0 && (
            <div className="space-y-0.5" onClick={e => e.stopPropagation()}>
              {todo.subtasks.map(sub => (
                <label
                  key={sub.id}
                  className="flex items-center gap-2 cursor-pointer group/sub"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-[1.5px] shrink-0 flex items-center justify-center transition-all ${
                      sub.completed
                        ? 'border-transparent'
                        : 'border-slate-300 group-hover/sub:border-slate-400'
                    }`}
                    style={sub.completed ? { backgroundColor: cfg.checkColor } : {}}
                    onClick={() => {
                      const updated = todo.subtasks.map(s =>
                        s.id === sub.id ? { ...s, completed: !s.completed } : s
                      );
                      onUpdate({ subtasks: updated });
                    }}
                  >
                    {sub.completed && (
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </span>
                  <span
                    className={`text-[12px] leading-snug select-none ${
                      sub.completed ? 'line-through text-slate-300' : 'text-slate-500'
                    }`}
                    onClick={() => {
                      const updated = todo.subtasks.map(s =>
                        s.id === sub.id ? { ...s, completed: !s.completed } : s
                      );
                      onUpdate({ subtasks: updated });
                    }}
                  >
                    {sub.title}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* ── Add subtask ── */}
          {!todo.completed && addingSubtask && (
            <div className="flex items-center gap-1.5 animate-slide-down" onClick={e => e.stopPropagation()}>
              <span className="w-3 h-3 rounded-full border-[1.5px] border-slate-300 shrink-0" />
              <input
                ref={subInputRef}
                value={subInput}
                onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitSubtask();
                  if (e.key === 'Escape') { setAddingSubtask(false); setSubInput(''); }
                }}
                onBlur={() => { submitSubtask(); setAddingSubtask(false); }}
                placeholder="添加子任务…"
                className="flex-1 text-[11px] text-slate-600 bg-transparent outline-none placeholder-slate-300 border-b border-slate-200 pb-0.5"
              />
            </div>
          )}

          {/* ── Milestone timeline ── */}
          {(todo.milestones ?? []).length > 0 && (
            <div className="relative ml-0.5 mt-1" onClick={e => e.stopPropagation()}>
              {/* vertical line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-200" />
              <div className="space-y-1.5">
                {(todo.milestones ?? []).map(m => (
                  <div key={m.id} className="flex items-start gap-2.5">
                    {/* dot */}
                    <button
                      onClick={() => {
                        const updated = (todo.milestones ?? []).map(x => x.id === m.id ? { ...x, completed: !x.completed } : x);
                        onUpdate({ milestones: updated });
                      }}
                      className={`relative z-10 mt-0.5 w-[11px] h-[11px] rounded-full border-2 shrink-0 transition-all ${
                        m.completed
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'bg-white border-slate-300 hover:border-indigo-400'
                      }`}
                    >
                      {m.completed && (
                        <svg className="w-1.5 h-1.5 text-white absolute inset-0 m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      )}
                    </button>
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className={`text-[11px] leading-snug ${m.completed ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                        {m.title}
                      </span>
                      {m.date && (
                        <span className={`text-[10px] shrink-0 ${
                          m.completed ? 'text-slate-300' :
                          m.date < new Date().toISOString().split('T')[0] ? 'text-red-400' :
                          m.date === new Date().toISOString().split('T')[0] ? 'text-amber-500' :
                          'text-slate-400'
                        }`}>
                          {m.date}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Bottom row: time + meta ── */}
          <div className="flex flex-wrap items-center gap-1.5">

            {/* Time badge — terminal style */}
            {hasTime && (
              <button
                onClick={e => { e.stopPropagation(); onToggleTracking(); }}
                title={todo.isTracking ? '停止计时' : '开始计时'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all duration-200 ${
                  todo.isTracking
                    ? 'bg-slate-900 text-emerald-400 animate-timer-glow'
                    : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                }`}
              >
                {todo.isTracking ? (
                  <>
                    <span className="relative flex w-2 h-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"/>
                      <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-400"/>
                    </span>
                    <span>{formatTimeChinese(todo.timeSpent)}</span>
                    <span className="text-emerald-600/70 text-[9px] font-sans tracking-widest">REC</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{formatTimeChinese(todo.timeSpent)}</span>
                  </>
                )}
              </button>
            )}

            {/* Due date */}
            {todo.dueDate && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-[3px] rounded-md ${
                isOverdue(todo.dueDate) ? 'bg-red-50 text-red-500'
                  : isToday(todo.dueDate) ? 'bg-amber-50 text-amber-600'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {isOverdue(todo.dueDate)
                  ? <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>逾期</>
                  : isToday(todo.dueDate) ? '今天' : todo.dueDate
                }
              </span>
            )}

            {/* List */}
            {list && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: list.color }}/>
                {list.name}
              </span>
            )}

            {/* Created at + Started at */}
            <span className="inline-flex items-center gap-2 text-[11px] text-slate-300 ml-auto">
              <span className="inline-flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                {formatCreatedAt(todo.createdAt)}
                {(() => {
                  const days = Math.floor((Date.now() - new Date(todo.createdAt).getTime()) / 86400000);
                  if (days === 0) return null;
                  return (
                    <span className="ml-0.5 px-1 py-px rounded text-[9px] font-semibold bg-slate-100 text-slate-400">
                      {days}天
                    </span>
                  );
                })()}
              </span>
              {todo.startedAt && (
                <span className="inline-flex items-center gap-1 text-emerald-400/70">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {formatCreatedAt(todo.startedAt)}
                </span>
              )}
            </span>

          </div>
        </div>

        {/* ── Hover action strip ── */}
        <div className="task-actions absolute right-1 top-1 flex flex-col gap-0.5">
          {/* Timer button — always visible when tracking, hover-visible otherwise */}
          <button onClick={e => { e.stopPropagation(); onToggleTracking(); }}
            className={`relative p-1.5 rounded-lg transition-all duration-200 ${
              todo.isTracking
                ? 'timer-btn-tracking text-emerald-500 bg-emerald-50 animate-tracking-pulse'
                : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'
            }`}
            title={todo.isTracking ? '停止计时' : '开始计时'}>
            {todo.isTracking && (
              <span className="absolute inset-0 rounded-lg bg-emerald-400/20 animate-timer-ripple" />
            )}
            {todo.isTracking
              ? <svg className="w-3.5 h-3.5 relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            }
          </button>
          <button onClick={e => { e.stopPropagation(); onLinkTimer(); }}
            className={`p-1.5 rounded-lg transition-all ${timerLinked ? 'text-indigo-500 bg-indigo-50' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'}`}
            title={timerLinked ? '取消关联' : '关联番茄钟'}>
            <span className="text-[13px] leading-none">🍅</span>
          </button>
          <button onClick={e => { e.stopPropagation(); onClick(); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all" title="编辑">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </button>
          {!todo.completed && (
            <button onClick={e => { e.stopPropagation(); setAddingSubtask(true); }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-400 hover:bg-indigo-50 transition-all" title="添加子任务">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all" title="删除">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add task bar ── */
interface AddBarProps {
  lists: TodoList[];
  defaultListId?: string;
  onAdd: (title: string, listId: string, priority: Priority, dueDate: string | null) => void;
}
function AddBar({ lists, defaultListId, onAdd }: AddBarProps) {
  const [open, setOpen]         = useState(false);
  const [title, setTitle]       = useState('');
  const [priority, setPriority] = useState<Priority>(4);
  const [dueDate, setDueDate]   = useState('');
  const [listId, setListId]     = useState(defaultListId ?? lists[0]?.id ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { setListId(defaultListId ?? lists[0]?.id ?? ''); }, [defaultListId, lists]);

  function submit() {
    if (!title.trim()) return;
    onAdd(title.trim(), listId, priority, dueDate || null);
    setTitle(''); setPriority(4); setDueDate('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mx-4 mb-4 flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all text-sm group"
      >
        <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center group-hover:bg-indigo-500 group-hover:border-indigo-500 group-hover:text-white transition-all">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4"/>
          </svg>
        </div>
        添加任务
      </button>
    );
  }

  return (
    <div className="mx-4 mb-4 bg-white rounded-2xl border border-indigo-200 shadow-lg shadow-indigo-100/40 p-4 animate-slide-down">
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }}
        placeholder="任务名称…"
        className="w-full text-sm font-medium text-slate-800 outline-none border-b border-slate-200 pb-2 mb-3"
      />
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={priority}
          onChange={e => setPriority(Number(e.target.value) as Priority)}
          className="text-xs bg-slate-100 border-none outline-none rounded-lg px-2.5 py-1.5 text-slate-600 cursor-pointer"
        >
          <option value={1}>🔴 紧急</option>
          <option value={2}>🟠 高</option>
          <option value={3}>🔵 中</option>
          <option value={4}>⚪ 低</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="text-xs bg-slate-100 border-none outline-none rounded-lg px-2.5 py-1.5 text-slate-600 cursor-pointer"
        />
        {lists.length > 1 && (
          <select
            value={listId}
            onChange={e => setListId(e.target.value)}
            className="text-xs bg-slate-100 border-none outline-none rounded-lg px-2.5 py-1.5 text-slate-600 cursor-pointer"
          >
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">取消</button>
        <button onClick={submit} className="px-4 py-1.5 text-xs bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium shadow-sm">添加</button>
      </div>
    </div>
  );
}

/* ── Main TaskList ── */
interface Props {
  todos: Todo[];
  lists: TodoList[];
  selectedView: ViewFilter;
  selectedTodoId: string | null;
  timerLinkedTodo: string | null;
  onSelectTodo: (id: string | null) => void;
  onAddTodo: (title: string, listId: string, priority: Priority, dueDate: string | null) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
  onToggleTracking: (id: string) => void;
  onLinkToTimer: (id: string | null) => void;
  onReorderTodos: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
}

export default function TaskList({
  todos, lists, selectedView, selectedTodoId, timerLinkedTodo,
  onSelectTodo, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo,
  onToggleTracking, onLinkToTimer, onReorderTodos,
}: Props) {
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [showCompleted, setShowCompleted]     = useState(false);
  const [celebration, setCelebration]         = useState<Todo | null>(null);
  const [draggedId, setDraggedId]             = useState<string | null>(null);
  const [dragOverId, setDragOverId]           = useState<string | null>(null);
  const [dropPos, setDropPos]                 = useState<'before' | 'after'>('after');
  const [quickInput, setQuickInput]           = useState('');
  const quickInputRef                         = useRef<HTMLInputElement>(null);
  const editRowRef                            = useRef<EditRowHandle>(null);

  function closeEdit() {
    editRowRef.current?.save();
    setEditingId(null);
  }

  const today = new Date().toISOString().split('T')[0];

  function handleToggle(id: string) {
    const todo = todos.find(t => t.id === id);
    if (todo && !todo.completed) {
      setCelebration(todo);
    }
    onToggleTodo(id);
  }

  // ── Pointer-based drag-to-reorder ──
  const dragState = useRef<{
    id: string;
    itemEls: { id: string; top: number; height: number }[];
  } | null>(null);

  function getItemEls() {
    const els = document.querySelectorAll<HTMLElement>('[data-todo-id]');
    return Array.from(els).map(el => {
      const rect = el.getBoundingClientRect();
      return { id: el.dataset.todoId!, top: rect.top, height: rect.height };
    });
  }

  function handlePointerDown(e: React.PointerEvent, id: string) {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]')) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { id, itemEls: getItemEls() };
    requestAnimationFrame(() => setDraggedId(id));
  }

  function handlePointerMove(e: React.PointerEvent, id: string) {
    if (!dragState.current || dragState.current.id !== id) return;
    const y = e.clientY;
    let found = false;
    for (const item of dragState.current.itemEls) {
      if (item.id === id) continue;
      if (y >= item.top && y <= item.top + item.height) {
        setDragOverId(item.id);
        setDropPos(y < item.top + item.height / 2 ? 'before' : 'after');
        found = true;
        break;
      }
    }
    if (!found) setDragOverId(null);
  }

  function handlePointerUp(e: React.PointerEvent, id: string) {
    if (!dragState.current || dragState.current.id !== id) return;
    if (dragOverId && dragOverId !== id) {
      onReorderTodos(id, dragOverId, dropPos);
    }
    dragState.current = null;
    setDraggedId(null);
    setDragOverId(null);
  }

  function handlePointerCancel() {
    dragState.current = null;
    setDraggedId(null);
    setDragOverId(null);
  }

  // Filter todos by view
  const viewTodos = todos.filter(t => {
    if (selectedView === 'inbox')     return true;
    if (selectedView === 'today')     return t.dueDate === today;
    if (selectedView === 'upcoming')  return !t.dueDate || t.dueDate >= today;
    if (selectedView === 'completed') return t.completed;
    return t.listId === selectedView;
  });

  const active    = viewTodos.filter(t => !t.completed);
  const completed = viewTodos.filter(t => t.completed);

  const overdue   = active.filter(t => isOverdue(t.dueDate));
  const todayTodos = active.filter(t => isToday(t.dueDate) && !isOverdue(t.dueDate));
  const rest       = active.filter(t => !isOverdue(t.dueDate) && !isToday(t.dueDate));

  const viewLabel: Record<string, string> = {
    inbox: '收件箱', today: '今天', upcoming: '即将到来', completed: '已完成',
  };
  const currentList = lists.find(l => l.id === selectedView);
  const headerTitle = currentList?.name ?? viewLabel[selectedView] ?? '任务';
  const defaultListId = currentList?.id ?? lists.find(l => l.id === 'work')?.id ?? (lists[0]?.id ?? '');

  function renderGroup(label: string, items: Todo[], labelClass = 'text-slate-500', startIndex = 0) {
    if (!items.length) return null;
    return (
      <div key={label} className="mb-2">
        <div className={`px-4 pb-1.5 text-xs font-semibold uppercase tracking-wide ${labelClass}`}>
          {label} · {items.length}
        </div>
        {items.map((t, i) => {
          const beingDragged = draggedId === t.id;
          const isTarget     = dragOverId === t.id && !beingDragged;
          const index        = startIndex + i + 1;
          return (
            <div
              key={t.id}
              data-todo-id={t.id}
              onPointerDown={e => handlePointerDown(e, t.id)}
              onPointerMove={e => handlePointerMove(e, t.id)}
              onPointerUp={e => handlePointerUp(e, t.id)}
              onPointerCancel={handlePointerCancel}
              onClick={e => e.stopPropagation()}
              className={`relative ${beingDragged ? 'opacity-40' : ''}`}
              style={{ touchAction: 'none' }}
            >
              {isTarget && dropPos === 'before' && <DropLine />}
              <TaskItem
                todo={t}
                index={index}
                lists={lists}
                isSelected={selectedTodoId === t.id}
                isEditing={editingId === t.id}
                timerLinked={timerLinkedTodo === t.id}
                isDragging={beingDragged}
                editRowRef={editingId === t.id ? editRowRef : undefined}
                onClick={() => { setEditingId(t.id); onSelectTodo(t.id); }}
                onToggle={() => handleToggle(t.id)}
                onDelete={() => onDeleteTodo(t.id)}
                onUpdate={u => onUpdateTodo(t.id, u)}
                onEditEnd={() => setEditingId(null)}
                onToggleTracking={() => onToggleTracking(t.id)}
                onLinkTimer={() => onLinkToTimer(timerLinkedTodo === t.id ? null : t.id)}
              />
              {isTarget && dropPos === 'after' && <DropLine />}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        {currentList && (
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: currentList.color }}/>
        )}
        <h1 className="font-bold text-xl text-slate-800">{headerTitle}</h1>
        <span className="text-sm text-slate-400 font-medium tabular-nums bg-slate-100 px-2 py-0.5 rounded-full">
          {active.length}
        </span>

        {/* Quick add input */}
        {selectedView !== 'completed' && (
          <form
            className="flex-1 flex items-center gap-2 ml-2"
            onSubmit={e => {
              e.preventDefault();
              if (!quickInput.trim()) return;
              onAddTodo(quickInput.trim(), defaultListId, 4, null);
              setQuickInput('');
            }}
          >
            <input
              ref={quickInputRef}
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              placeholder="快速添加任务，回车确认…"
              className="flex-1 text-sm bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-indigo-300 focus:shadow-sm rounded-xl px-3.5 py-1.5 outline-none text-slate-700 placeholder-slate-400 transition-all"
            />
          </form>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-400">
          {todos.some(t => t.isTracking) && (
            <span className="flex items-center gap-1.5 text-green-600 font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"/>计时中
            </span>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto py-4" onClick={() => closeEdit()}>
        <DailyBadges todos={todos} />
        <TimeStats todos={todos} lists={lists} />

        {selectedView !== 'completed' && (
          <AddBar lists={lists} defaultListId={defaultListId} onAdd={onAddTodo} />
        )}

        {active.length === 0 && selectedView !== 'completed' && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 animate-fade-in">
            <div className="text-5xl mb-4">🎉</div>
            <p className="font-medium text-slate-500">全部完成！</p>
            <p className="text-sm mt-1">添加新任务开始今天的工作</p>
          </div>
        )}

        {renderGroup('已逾期', overdue, 'text-red-400', 0)}
        {renderGroup('今天', todayTodos, 'text-orange-500', overdue.length)}
        {renderGroup('其他', rest, 'text-slate-500', overdue.length + todayTodos.length)}

        {/* Completed section */}
        {completed.length > 0 && selectedView !== 'completed' && (
          <div className="mt-2">
            <button
              onClick={() => setShowCompleted(s => !s)}
              className="flex items-center gap-2 px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
              已完成 · {completed.length}
            </button>
            {showCompleted && completed.map((t, i) => (
              <TaskItem
                key={t.id}
                todo={t}
                index={active.length + i + 1}
                lists={lists}
                isSelected={false}
                isEditing={false}
                timerLinked={false}
                isDragging={false}
                onClick={() => {}}
                onToggle={() => handleToggle(t.id)}
                onDelete={() => onDeleteTodo(t.id)}
                onUpdate={u => onUpdateTodo(t.id, u)}
                onEditEnd={() => {}}
                onToggleTracking={() => {}}
                onLinkTimer={() => {}}
              />
            ))}
          </div>
        )}

        {selectedView === 'completed' && (
          <>
            {completed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 animate-fade-in">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-sm">暂无已完成任务</p>
              </div>
            ) : (
              <div className="mb-2">
                <div className="px-4 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  已完成 · {completed.length}
                </div>
                {completed.map((t, i) => (
                  <TaskItem
                    key={t.id}
                    todo={t}
                    index={i + 1}
                    lists={lists}
                    isSelected={false}
                    isEditing={false}
                    timerLinked={false}
                    isDragging={false}
                    onClick={() => {}}
                    onToggle={() => handleToggle(t.id)}
                    onDelete={() => onDeleteTodo(t.id)}
                    onUpdate={u => onUpdateTodo(t.id, u)}
                    onEditEnd={() => {}}
                    onToggleTracking={() => {}}
                    onLinkTimer={() => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {celebration && (
        <CelebrationToast
          todo={celebration}
          completedToday={todos.filter(t => t.completed).length}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </div>
  );
}
