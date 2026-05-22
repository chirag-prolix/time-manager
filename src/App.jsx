import { useState, useEffect, useRef } from 'react';
import { generateId, today, toDateString, getElapsedMs } from './utils';
import { supabase, toDbTask, fromDbTask, toDbRewards, fromDbRewards } from './supabase';
import AuthPage from './components/AuthPage';
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
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
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
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState(null);
  const tickRef = useRef(null);

  // Auth state — check session on mount and listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data whenever user changes
  useEffect(() => {
    if (user) {
      loadData(user.id);
      const saved = localStorage.getItem('tm-date');
      if (saved) setSelectedDate(saved);
    } else if (user === null) {
      setTasks([]);
      setRewards(DEFAULT_REWARDS);
    }
  }, [user]);

  // Persist selected date
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

  async function loadData(userId) {
    setIsLoading(true);
    setDbError(null);
    try {
      const [tasksRes, rewardsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('rewards').select('*').eq('user_id', userId).single(),
      ]);

      if (tasksRes.error) throw tasksRes.error;

      setTasks((tasksRes.data || []).map(fromDbTask));
      setRewards(rewardsRes.data ? fromDbRewards(rewardsRes.data) : DEFAULT_REWARDS);

      // Migrate any existing tasks with no user_id to this user
      await supabase.from('tasks').update({ user_id: userId }).is('user_id', null);
      await supabase.from('rewards').update({ user_id: userId }).is('user_id', null);
    } catch (err) {
      console.error('Load error:', err);
      setDbError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setTasks([]);
    setRewards(DEFAULT_REWARDS);
    setSelectedTaskId(null);
  }

  // --- Task actions ---

  async function addTask(fields) {
    const task = {
      id: generateId(),
      userId: user.id,
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
    const { error } = await supabase.from('tasks').insert(toDbTask(task, user.id));
    if (error) console.error('Add task error:', error);
  }

  async function updateTask(id, updates) {
    let updated;
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      updated = { ...t, ...updates };
      return updated;
    }));
    if (updated) {
      const { error } = await supabase.from('tasks').upsert(toDbTask(updated, user.id));
      if (error) console.error('Update task error:', error);
    }
  }

  async function deleteTask(id) {
    if (id === selectedTaskId) setSelectedTaskId(null);
    setTasks(prev => prev.filter(t => t.id !== id));
    setDeleteConfirmId(null);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('Delete task error:', error);
  }

  async function startTimer(id) {
    const now = new Date().toISOString();
    const updatedList = [];
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
          const u = { ...t, status: 'in-progress', timerStartedAt: now, actualStart: t.actualStart || now };
          updatedList.push(u);
          return u;
        }
        if (t.timerStartedAt) {
          const elapsed = Date.now() - new Date(t.timerStartedAt).getTime();
          const u = { ...t, accumulatedMs: (t.accumulatedMs || 0) + elapsed, timerStartedAt: null, status: 'paused' };
          updatedList.push(u);
          return u;
        }
        return t;
      });
      return next;
    });
    setTimeout(async () => {
      for (const u of updatedList) {
        await supabase.from('tasks').upsert(toDbTask(u, user.id));
      }
    }, 0);
    setRewards(prev => {
      const next = { ...prev, timerUseCount: prev.timerUseCount + 1 };
      next.badges = checkBadges(next);
      syncRewards(next);
      return next;
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
    if (updated) await supabase.from('tasks').upsert(toDbTask(updated, user.id));
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
    if (updated) await supabase.from('tasks').upsert(toDbTask(updated, user.id));
    triggerComplete(id);
  }

  async function completeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const now = new Date().toISOString();
    const extraMs = task.timerStartedAt ? Date.now() - new Date(task.timerStartedAt).getTime() : 0;
    const updated = { ...task, status: 'completed', timerStartedAt: null, actualEnd: task.actualEnd || now, accumulatedMs: (task.accumulatedMs || 0) + extraMs };
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    await supabase.from('tasks').upsert(toDbTask(updated, user.id));
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
      const yesterday = toDateString(new Date(Date.now() - 86400000));
      let newStreak = prev.lastCompletedDate === yesterday ? prev.streakDays + 1 : prev.streakDays;
      if (prev.lastCompletedDate !== todayStr) newStreak = prev.lastCompletedDate === yesterday ? prev.streakDays + 1 : 1;
      const next = { ...prev, points: newPoints, completedCount: newCompleted, streakDays: newStreak, lastCompletedDate: todayStr };
      next.badges = checkBadges(next);
      syncRewards(next);
      return next;
    });
    setShowConfetti(true);
    setPointsBadge({ amount: points });
    setTimeout(() => setPointsBadge(null), 2200);
  }

  async function syncRewards(r) {
    await supabase.from('rewards').upsert(toDbRewards(r, user.id));
  }

  function checkBadges(r) {
    const s = new Set(r.badges || []);
    [
      ['first_task', r.completedCount >= 1], ['five_tasks', r.completedCount >= 5],
      ['ten_tasks', r.completedCount >= 10], ['streak_3', r.streakDays >= 3],
      ['streak_7', r.streakDays >= 7], ['points_50', r.points >= 50],
      ['points_100', r.points >= 100], ['timer_5', r.timerUseCount >= 5],
      ['timer_20', r.timerUseCount >= 20],
    ].forEach(([id, earned]) => { if (earned) s.add(id); });
    return [...s];
  }

  // --- Render ---

  // Still checking session
  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, color: 'var(--gray-500)' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span>Loading…</span>
      </div>
    );
  }

  // Not logged in
  if (user === null) return <AuthPage />;

  // Loading data
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, color: 'var(--gray-500)' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span>Loading your tasks…</span>
      </div>
    );
  }

  if (dbError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontWeight: 600 }}>Database error</div>
        <div style={{ fontSize: 13, color: 'var(--gray-500)', maxWidth: 400 }}>{dbError}</div>
        <button className="btn-primary" onClick={() => loadData(user.id)}>Retry</button>
      </div>
    );
  }

  const dateTasks = tasks.filter(t => t.date === selectedDate);
  const filteredTasks = (() => {
    let r = dateTasks;
    if (filters.statuses?.length) r = r.filter(t => filters.statuses.includes(t.status));
    if (filters.priorities?.length) r = r.filter(t => filters.priorities.includes(t.priority));
    return sortTasks(r, filters.sortBy);
  })();
  const activeTasks = filteredTasks.filter(t => t.status !== 'completed');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null;
  const VIEW_TITLES = { tasks: 'Tasks', timeline: 'Timeline', summary: 'Daily Summary', rewards: 'Rewards' };

  return (
    <div className="app">
      <Header selectedDate={selectedDate} onDateChange={setSelectedDate} user={user} onLogout={handleLogout} />
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

      {pointsBadge && (
        <div className="points-badge" style={{ bottom: 80, right: 32 }}>+{pointsBadge.amount} pts</div>
      )}

      <Confetti show={showConfetti} onDone={() => setShowConfetti(false)} />
    </div>
  );
}
