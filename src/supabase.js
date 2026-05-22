import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function toDbTask(task) {
  return {
    id: task.id,
    date: task.date,
    title: task.title,
    description: task.description || '',
    project: task.project || '',
    priority: task.priority || 'medium',
    status: task.status,
    estimated_duration: task.estimatedDuration || null,
    tags: task.tags || [],
    location: task.location || '',
    actual_start: task.actualStart || null,
    actual_end: task.actualEnd || null,
    accumulated_ms: task.accumulatedMs || 0,
    timer_started_at: task.timerStartedAt || null,
    created_at: task.createdAt,
  };
}

export function fromDbTask(row) {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    description: row.description || '',
    project: row.project || '',
    priority: row.priority || 'medium',
    status: row.status || 'planned',
    estimatedDuration: row.estimated_duration || null,
    tags: row.tags || [],
    location: row.location || '',
    actualStart: row.actual_start || null,
    actualEnd: row.actual_end || null,
    accumulatedMs: row.accumulated_ms || 0,
    timerStartedAt: row.timer_started_at || null,
    createdAt: row.created_at,
  };
}

export function toDbRewards(r) {
  return {
    id: 1,
    points: r.points || 0,
    streak_days: r.streakDays || 0,
    completed_count: r.completedCount || 0,
    timer_use_count: r.timerUseCount || 0,
    badges: r.badges || [],
    last_completed_date: r.lastCompletedDate || null,
  };
}

export function fromDbRewards(row) {
  return {
    points: row.points || 0,
    streakDays: row.streak_days || 0,
    completedCount: row.completed_count || 0,
    timerUseCount: row.timer_use_count || 0,
    badges: row.badges || [],
    lastCompletedDate: row.last_completed_date || null,
  };
}
