'use client';

import { useState, useEffect, useCallback } from 'react';
import { Todo, TodoList, ViewFilter, Priority } from '@/types/todo';
import Sidebar from './Sidebar';
import TaskList from './TaskList';
import PomodoroTimer from './PomodoroTimer';
import CalendarView from './CalendarView';

function genId() { return Math.random().toString(36).slice(2, 11); }

const DEFAULT_LISTS: TodoList[] = [
  { id: 'personal', name: '个人',  color: '#6366f1' },
  { id: 'work',     name: '工作',  color: '#f97316' },
  { id: 'shopping', name: '购物',  color: '#10b981' },
];

const today = new Date().toISOString().split('T')[0];

const DEFAULT_TODOS: Todo[] = [
  {
    id: 'demo1',
    title: '完成项目季度报告',
    description: '整理Q4数据，生成可视化图表并编写摘要',
    completed: false,
    priority: 1,
    dueDate: today,
    listId: 'work',
    tags: [],
    subtasks: [
      { id: 'ds1', title: '收集销售数据', completed: true },
      { id: 'ds2', title: '制作数据图表', completed: false },
      { id: 'ds3', title: '编写执行摘要', completed: false },
    ],
    createdAt: new Date().toISOString(),
    timeSpent: 2700,
    isTracking: false,
    trackingStart: null,
    startedAt: null,
    startTime: null,
    endTime: null,
  },
  {
    id: 'demo2',
    title: '阅读《原则》第三章',
    description: '每天30分钟阅读计划',
    completed: false,
    priority: 3,
    dueDate: today,
    listId: 'personal',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    timeSpent: 0,
    isTracking: false,
    trackingStart: null,
    startedAt: null,
    startTime: null,
    endTime: null,
  },
  {
    id: 'demo3',
    title: '购买食材',
    description: '牛肉、西兰花、鸡蛋、牛奶',
    completed: false,
    priority: 4,
    dueDate: null,
    listId: 'shopping',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    timeSpent: 0,
    isTracking: false,
    trackingStart: null,
    startedAt: null,
    startTime: null,
    endTime: null,
  },
  {
    id: 'demo4',
    title: '回复客户邮件',
    description: '',
    completed: true,
    priority: 2,
    dueDate: today,
    listId: 'work',
    tags: [],
    subtasks: [],
    createdAt: new Date().toISOString(),
    timeSpent: 600,
    isTracking: false,
    trackingStart: null,
    startedAt: null,
    startTime: null,
    endTime: null,
  },
];

export default function TodoApp() {
  const [todos,         setTodos        ] = useState<Todo[]>([]);
  const [lists,         setLists        ] = useState<TodoList[]>([]);
  const [selectedView,  setSelectedView ] = useState<ViewFilter>('inbox');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [showTimer,     setShowTimer    ] = useState(true);
  const [timerLinked,   setTimerLinked  ] = useState<string | null>(null);
  const [hydrated,      setHydrated     ] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem('taskflow_todos');
      const l = localStorage.getItem('taskflow_lists');
      setTodos(t ? JSON.parse(t) : DEFAULT_TODOS);
      setLists(l ? JSON.parse(l) : DEFAULT_LISTS);
    } catch {
      setTodos(DEFAULT_TODOS);
      setLists(DEFAULT_LISTS);
    }
    setHydrated(true);
  }, []);

  // Persist todos
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('taskflow_todos', JSON.stringify(todos));
  }, [todos, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('taskflow_lists', JSON.stringify(lists));
  }, [lists, hydrated]);

  // Task time tracking ticker
  useEffect(() => {
    const id = setInterval(() => {
      setTodos(prev => {
        const hasTracking = prev.some(t => t.isTracking);
        if (!hasTracking) return prev;
        return prev.map(t => {
          if (!t.isTracking || !t.trackingStart) return t;
          const elapsed = Math.floor((Date.now() - t.trackingStart) / 1000);
          return { ...t, timeSpent: t.timeSpent + elapsed, trackingStart: Date.now() };
        });
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const addTodo = useCallback((
    title: string,
    listId: string,
    priority: Priority,
    dueDate: string | null,
    startTime: string | null = null,
    endTime: string | null = null,
  ) => {
    if (!title.trim()) return;
    const todo: Todo = {
      id: genId(),
      title: title.trim(),
      description: '',
      completed: false,
      priority,
      dueDate,
      listId,
      tags: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
      timeSpent: 0,
      isTracking: false,
      trackingStart: null,
      startedAt: null,
      startTime,
      endTime,
    };
    setTodos(p => [todo, ...p]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed, isTracking: false, trackingStart: null } : t));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(p => p.filter(t => t.id !== id));
    if (selectedTodoId === id) setSelectedTodoId(null);
    if (timerLinked === id) setTimerLinked(null);
  }, [selectedTodoId, timerLinked]);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos(p => p.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const toggleTracking = useCallback((id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        if (t.isTracking) {
          const extra = t.trackingStart ? Math.floor((Date.now() - t.trackingStart) / 1000) : 0;
          return { ...t, isTracking: false, trackingStart: null, timeSpent: t.timeSpent + extra };
        }
        return { ...t, isTracking: true, trackingStart: Date.now(), startedAt: t.startedAt ?? new Date().toISOString() };
      }
      // stop any other tracking
      if (t.isTracking) {
        const extra = t.trackingStart ? Math.floor((Date.now() - t.trackingStart) / 1000) : 0;
        return { ...t, isTracking: false, trackingStart: null, timeSpent: t.timeSpent + extra };
      }
      return t;
    }));
  }, []);

  const addList = useCallback((name: string, color: string) => {
    setLists(p => [...p, { id: genId(), name, color }]);
  }, []);

  const deleteList = useCallback((id: string) => {
    setLists(p => p.filter(l => l.id !== id));
    setTodos(p => p.filter(t => t.listId !== id));
    if (selectedView === id) setSelectedView('inbox');
  }, [selectedView]);

  const addTimerTime = useCallback((todoId: string, seconds: number) => {
    setTodos(p => p.map(t => t.id === todoId ? { ...t, timeSpent: t.timeSpent + seconds } : t));
  }, []);

  const reorderTodos = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
    setTodos(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t => t.id === draggedId);
      if (fromIdx === -1) return prev;
      const [item] = arr.splice(fromIdx, 1);
      const toIdx = arr.findIndex(t => t.id === targetId);
      if (toIdx === -1) return prev;
      arr.splice(position === 'before' ? toIdx : toIdx + 1, 0, item);
      return arr;
    });
  }, []);

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
          <span className="text-sm">加载中…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      <Sidebar
        lists={lists}
        todos={todos}
        selectedView={selectedView}
        onSelectView={setSelectedView}
        onAddList={addList}
        onDeleteList={deleteList}
        showTimer={showTimer}
        onToggleTimer={() => setShowTimer(s => !s)}
      />

      <main className="flex flex-1 min-w-0 overflow-hidden gap-px bg-slate-200/60">
        {selectedView === 'calendar' && (
          <CalendarView
            todos={todos}
            lists={lists}
            onAddTodo={addTodo}
            onToggleTodo={toggleTodo}
          />
        )}
        {selectedView !== 'calendar' && <TaskList
          todos={todos}
          lists={lists}
          selectedView={selectedView}
          selectedTodoId={selectedTodoId}
          timerLinkedTodo={timerLinked}
          onSelectTodo={setSelectedTodoId}
          onAddTodo={addTodo}
          onToggleTodo={toggleTodo}
          onDeleteTodo={deleteTodo}
          onUpdateTodo={updateTodo}
          onToggleTracking={toggleTracking}
          onLinkToTimer={setTimerLinked}
          onReorderTodos={reorderTodos}
        />}

        {selectedView !== 'calendar' && showTimer && (
          <PomodoroTimer
            todos={todos}
            linkedTodoId={timerLinked}
            onLinkTodo={setTimerLinked}
            onTimeAdd={addTimerTime}
          />
        )}

      </main>
    </div>
  );
}
