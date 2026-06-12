export type Priority = 1 | 2 | 3 | 4;

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  date: string | null;   // "YYYY-MM-DD"
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  listId: string;
  tags: string[];
  subtasks: Subtask[];
  milestones: Milestone[];
  createdAt: string;
  completedAt: string | null; // ISO timestamp when marked complete, null otherwise
  timeSpent: number;
  isTracking: boolean;
  trackingStart: number | null;
  startedAt: string | null;
  startTime: string | null; // "HH:MM"
  endTime: string | null;   // "HH:MM"
  dailyTime: Record<string, number>; // "YYYY-MM-DD" → seconds
}

export interface TodoList {
  id: string;
  name: string;
  color: string;
}

export type ViewFilter = 'inbox' | 'today' | 'upcoming' | 'completed' | string;
