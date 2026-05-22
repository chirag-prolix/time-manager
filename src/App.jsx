import { useState, useEffect, useRef } from 'react';
import { generateId, today, toDateString, getElapsedMs } from './utils';
import { supabase, toDbTask, fromDbTask, toDbRewards, fromDbRewards } from './supabase';
import Header from './components/Header';
import QuickAdd from './components/QuickAdd';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import RightRail from './components/RightRail';
import TimelineView from './components/TimelineView';
import SummaryView from './components/SummaryView';
import RewardsView from './components/RewardsView';
import Confetti from './components/Confetti';
import Footer from './components/Footer';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const POINTS_PER_TASK = 10;
const POINTS_TIMER_BONUS = 5;

const DEFAULT_REWARDS = {
  points: 0, streakDays: 0, completedCount: 0,
  timerUseCount: 0, badges: [], lastCompletedDate: null,
};

function sortTasks(tasks, sortBy) {
  const t = [...tasks];
  switch (sortBy) {
    case 'createdAt-asc': return t.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'priority-desc': return t.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
    case 'status': {
      const order = { 'in-progress': 0, paused: 1, planned: 2, completed: 3 };
      return t.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));
    }
    case 'title-asc': return t.sort((a, b) => a.title.localeCompare(b.title));
    default: return t.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState(DEFAULT_REWARDS);
  const [selectedDate, setSelectedDate] = useState(today());
  const [filters, setFilters] = useState({ statuses: [], priorities: [], sortBy: 'createdAt-desc' });
  const [view, setView] = useState('tasks');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pointsBadge, setPointsBadge] = useState(null);
  const [tick, setTick] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const tickRef = useRef(null);

  // Load data from Supabase on mount, migrate localStorage if present
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setDbError(null);
    try {
      const [tasksRes, rewardsRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('rewards').select('*').eq('id', 1).single(),
      ]);

      if (tasksRes.error) throw tasksRes.error;

      const remoteTasks = (tasksRes.data || []).map(fromDbTask);
      const remoteRewards = rewardsRes.data ? fromDbRewards(rewardsRes.data) : DEFAULT_REWARDS;

      // Migrate from localStorage if remote is empty and local has data
      const localTasks = parseLocal('tm-tasks', []);
      const localRewards = parseLocal('tm-rewards', null);

      if (remoteTasks.length === 0 && localTasks.length > 0) {
        await supabase.from('tasks').upsert(localTasks.map(toDbTask));
        if (localRewards) {
          await supabase.from('rewards').upsert(toDbRewards(localRewards));
        }
        setTasks(localTasks);
        setRewards(localRewards || DEFAULT_REWARDS);
        clearLocal();
      } else {
        setTasks(remoteTasks);
        setRewards(remoteRewards);
        clearLocal();
      }

      const savedDate = localStorage.getItem('tm-date');
      if (savedDate) setSelectedDate(savedDate);
    } catch (err) {
      console.error('Supabase error:', err);
      setDbError('Could not connect to database. Check your Supabase credentials and table setup.');
    } finally {
      setIsLoading(false);
    }
  }

  function parseLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }

  function clearLocal() {
    localStorage.removeItem('tm-tasks');
    localStorage.removeItem('tm-rewards');
  }

  // Persist selected date in localStorage (UI preference only)
  useEffect(() => {
    localStorage.setItem('tm-date', selectedDate);
  }, [selectedDate]);

  // Timer tick
  const hasActiveTimer = tasks.some(t => !!t.timerStartedAt);
  useEffect(() => {
    if (hasActiveTimer) {
      tickRef.current = setInterval(() => setTick(n => n + 1), 1000);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [hasActiveTimer]);

  // Derived state
  const dateTasks = tasks.filter(t => t.date === selectedDate);
  const filteredTasks = (() => {
    let result = dateTasks;
    if (filters.statuses?.length) result = result.filter(t => filters.statuses.includes(t.status));
    if (filters.priorities?.length) result = result.filter(t => filters.priorities.includes(t.priority));
    return sortTasks(result, filters.sortBy);
  })();
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const activeTasks = filteredTasks.filter(t => t.status !== 'completed');
  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null;

  // --- Actions ---

  async function addTask(fields) {
    const task = {
      id: generateId(),
      title: fields.title,
      description: fields.description || '',
      project: fields.project || '',
      priority: fields.priority || 'medium',
      estimatedDuration: fields.estimatedDuration || null,
      tags: fields.tags || [],
      location: fields.location || '',
      status: 'planned',
      actualStart: null,
      actualEnd: null,
      accumulatedMs: 0,
      timerStartedAt: null,
      createdAt: new Date().toISOString(),
      date: selectedDate,
    };
    setTasks(prev => [task, ...prev]);
    const { error } = await supabase.from('tasks').insert(toDbTask(task));
    if (error) console.error('Failed to add task:', error);
  }

  async function updateTask(id, updates) {
    let updated;
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      updated = { ...t, ...updates };
      return updated;
    }));
    if (updated) {
      const { error } = await supabase.from('tasks').upsert(toDbTask(updated));
      if (error) console.error('Failed to update task:', error);
    }
  }

  async function deleteTask(id) {
    if (id === selectedTaskId) setSelectedTaskId(null);
    setTasks(prev => prev.filter(t => t.id !== id));
    setDeleteConfirmId(null);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('Failed to delete task:', error);
  }

  async function startTimer(id) {
    const now = new Date().toISOString();
    const updatedTasks = [];

    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
          const u = { ...t, status: 'in-progress', timerStartedAt: now, actualStart: t.actualStart || now };
          updatedTasks.push(u);
          return u;
        }
        if (t.timerStartedAt) {
          const elapsed = Date.now() - new Date(t.timerStartedAt).getTime();
          const u = { ...t, accumulatedMs: (t.accumulatedMs || 0) + elapsed, timerStartedAt: null, status: 'paused' };
          updatedTasks.push(u);
          return u;
        }
        return t;
      });
      return next;
    });

    setTimeout(async () => {
      for (const u of updatedTasks) {
        const { error } = await supabase.from('tasks').upsert(toDbTask(u));
        if (error) console.error('Failed to sync timer start:', error);
      }
    }, 0);

    setRewards(prev => {
      const newCount = prev.timerUseCount + 1;
      const updated = { ...prev, timerUseCount: newCount };
      updated.badges = checkBadges(updated);
      syncRewards(updated);
      return updated;
    });
  }

  async function pauseTimer(id) {
    let updated;
    setTasks(prev => prev.map(t => {
      if (t.id !== id || !t.timerStartedAt) return t;
      const elapsed = Date.now() - new Date(t.timerStartedAt).getTime();
      updated = { ...t, accumulatedMs: (t.accumulatedMs || 0) + elapsed, timerStartedAt: null, status: 'paused' };
      return updated;
    }));
    if (updated) {
      const { error } = await supabase.from('tasks').upsert(toDbTask(updated));
      if (error) console.error('Failed to sync pause:', error);
    }
  }

  async function stopTimer(id) {
    const now = new Date().toISOString();
    let updated;
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const extraMs = t.timerStartedAt ? Date.now() - new Date(t.timerStartedAt).getTime() : 0;
      updated = { ...t, status: 'completed', timerStartedAt: null, actualEnd: now, accumulatedMs: (t.accumulatedMs || 0) + extraMs };
      return updated;
    }));
    if (updated) {
      const { error } = await supabase.from('tasks').upsert(toDbTask(updated));
      if (error) console.error('Failed to sync stop:', error);
    }
    triggerComplete(id);
  }

  async function completeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const now = new Date().toISOString();
    const extraMs = task.timerStartedAt ? Date.now() - new Date(task.timerStartedAt).getTime() : 0;
    const updated = {
      ...task,
      status: 'completed',
      timerStartedAt: null,
      actualEnd: task.actualEnd || now,
      accumulatedMs: (task.accumulatedMs || 0) + extraMs,
    };
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    const { error } = await supabase.from('tasks').upsert(toDbTask(updated));
    if (error) console.error('Failed to sync complete:', error);
    triggerComplete(id);
  }

  function triggerComplete(id) {
    const task = tasks.find(t => t.id === id);
    const hadTimer = !!(task?.timerStartedAt || task?.accumulatedMs > 0);
    const points = POINTS_PER_TASK + (hadTimer ? POINTS_TIMER_BONUS : 0);

    setRewards(prev => {
      const newPoints = prev.points + points;
      const newCompleted = prev.completedCount + 1;
      const todayStr = today();
      let newStreak = prev.streakDays;
      if (prev.lastCompletedDate !== todayStr) {
        const yesterday = toDateString(new Date(Date.now() - 86400000));
        newStreak = prev.lastCompletedDate === yesterday ? prev.streakDays + 1 : 1;
      }
      const next = { ...prev, points: newPoints, completedCount: newCompleted, streakDays: newStreak, lastCompletedDate: todayStr };
      next.badges = checkBadges(next);
      syncRewards(next);
      return next;
    });

    setShowConfetti(true);
    setPointsBadge({ amount: points, show: true });
    setTimeout(() => setPointsBadge(null), 2200);
  }

  async function syncRewards(r) {
    const { error } = await supabase.from('rewards').upsert(toDbRewards(r));
    if (error) console.error('Failed to sync rewards:', error);
  }

  function checkBadges(r) {
    const current = new Set(r.badges || []);
    [
      ['first_task', r.completedCount >= 1],
      ['five_tasks', r.completedCount >= 5],
      ['ten_tasks', r.completedCount >= 10],
      ['streak_3', r.streakDays >= 3],
      ['streak_7', r.streakDays >= 7],
      ['points_50', r.points >= 50],
      ['points_100', r.points >= 100],
      ['timer_5', r.timerUseCount >= 5],
      ['timer_20', r.timerUseCount >= 20],
    ].forEach(([id, earned]) => { if (earned) current.add(id); });
    return [...current];
  }

  const VIEW_TITLES = { tasks: 'Tasks', timeline: 'Timeline', summary: 'Daily Summary', rewards: 'Rewards' };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, color: 'var(--gray-500)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: 14 }}>Connecting to database…</span>
      </div>
    );
  }

  if (dbError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>Database connection failed</div>
        <div style={{ fontSize: 13, color: 'var(--gray-500)', maxWidth: 400 }}>{dbError}</div>
        <button className="btn-primary" onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app">
      <Header selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <QuickAdd onAdd={addTask} />

      <div className="main-layout" style={{ flex: 1, overflow: 'hidden' }}>
        <Sidebar view={view} onViewChange={setView} filters={filters} onFiltersChange={setFilters} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="content-header">
            <div className="content-title">{VIEW_TITLES[view]}</div>
            {view === 'tasks' && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {view === 'tasks' && (
              <div className="content">
                {filteredTasks.length === 0 && (
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <div className="empty-state-title">No tasks for today</div>
                    <div className="empty-state-sub">Add one above to get started</div>
                  </div>
                )}
                {activeTasks.map(task => (
                  <TaskCard
                    key={task.id} task={task} tick={tick} isActiveTimer={!!task.timerStartedAt}
                    onSelect={id => setSelectedTaskId(id === selectedTaskId ? null : id)}
                    onStart={startTimer} onPause={pauseTimer} onStop={stopTimer}
                    onComplete={completeTask} onDelete={setDeleteConfirmId} onEdit={id => setSelectedTaskId(id)}
                  />
                ))}
                {completedTasks.length > 0 && (
                  <>
                    <div className="section-divider">Completed</div>
                    {completedTasks.map(task => (
                      <TaskCard
                        key={task.id} task={task} tick={tick} isActiveTimer={false}
                        onSelect={id => setSelectedTaskId(id === selectedTaskId ? null : id)}
                        onStart={startTimer} onPause={pauseTimer} onStop={stopTimer}
                        onComplete={completeTask} onDelete={setDeleteConfirmId} onEdit={id => setSelectedTaskId(id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
            {view === 'timeline' && <TimelineView tasks={dateTasks} tick={tick} onSelectTask={id => { setSelectedTaskId(id); setView('tasks'); }} />}
            {view === 'summary' && <SummaryView tasks={dateTasks} />}
            {view === 'rewards' && <RewardsView rewards={rewards} />}
          </div>
        </div>

        <RightRail
          task={selectedTask} tick={tick}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={updateTask} onStart={startTimer} onPause={pauseTimer}
          onStop={stopTimer} onComplete={completeTask}
        />
      </div>

      <Footer tasks={dateTasks} />

      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Delete Task</div>
            <div className="modal-body">
              Are you sure you want to delete "{tasks.find(t => t.id === deleteConfirmId)?.title}"? This cannot be undone.
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => deleteTask(deleteConfirmId)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {pointsBadge?.show && (
        <div className="points-badge" style={{ bottom: 80, right: 32 }}>+{pointsBadge.amount} pts</div>
      )}

      <Confetti show={showConfetti} onDone={() => setShowConfetti(false)} />
    </div>
  );
}
