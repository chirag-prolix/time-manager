import { useState, useEffect, useRef, useCallback } from 'react';
import { generateId, today, getElapsedMs } from './utils';
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

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const POINTS_PER_TASK = 10;
const POINTS_TIMER_BONUS = 5;
const STREAK_THRESHOLD = 3;

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, undefined: 3 };

function sortTasks(tasks, sortBy) {
  const t = [...tasks];
  switch (sortBy) {
    case 'createdAt-asc':
      return t.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'priority-desc':
      return t.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));
    case 'status': {
      const order = { 'in-progress': 0, paused: 1, planned: 2, completed: 3 };
      return t.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));
    }
    case 'title-asc':
      return t.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return t.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export default function App() {
  const [tasks, setTasks] = useState(() => load('tm-tasks', []));
  const [rewards, setRewards] = useState(() => load('tm-rewards', {
    points: 0, streakDays: 0, completedCount: 0, timerUseCount: 0, badges: [], lastCompletedDate: null,
  }));
  const [selectedDate, setSelectedDate] = useState(() => load('tm-date', today()));
  const [filters, setFilters] = useState({ statuses: [], priorities: [], sortBy: 'createdAt-desc' });
  const [view, setView] = useState('tasks');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pointsBadge, setPointsBadge] = useState(null);
  const [tick, setTick] = useState(0);

  const tickRef = useRef(null);

  // Persist state
  useEffect(() => { save('tm-tasks', tasks); }, [tasks]);
  useEffect(() => { save('tm-rewards', rewards); }, [rewards]);
  useEffect(() => { save('tm-date', selectedDate); }, [selectedDate]);

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

  // Filtered + sorted tasks for current date
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

  function addTask(fields) {
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
  }

  function updateTask(id, updates) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  function deleteTask(id) {
    if (id === selectedTaskId) setSelectedTaskId(null);
    setTasks(prev => prev.filter(t => t.id !== id));
    setDeleteConfirmId(null);
  }

  function startTimer(id) {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const now = new Date().toISOString();
        return {
          ...t,
          status: 'in-progress',
          timerStartedAt: now,
          actualStart: t.actualStart || now,
        };
      }
      // Pause any other running timer
      if (t.timerStartedAt) {
        const elapsed = Date.now() - new Date(t.timerStartedAt).getTime();
        return { ...t, accumulatedMs: (t.accumulatedMs || 0) + elapsed, timerStartedAt: null, status: 'paused' };
      }
      return t;
    }));
    setRewards(prev => {
      const newCount = prev.timerUseCount + 1;
      const newBadges = checkBadges({ ...prev, timerUseCount: newCount });
      return { ...prev, timerUseCount: newCount, badges: newBadges };
    });
  }

  function pauseTimer(id) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id || !t.timerStartedAt) return t;
      const elapsed = Date.now() - new Date(t.timerStartedAt).getTime();
      return { ...t, accumulatedMs: (t.accumulatedMs || 0) + elapsed, timerStartedAt: null, status: 'paused' };
    }));
  }

  function stopTimer(id) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const now = new Date().toISOString();
      const extraMs = t.timerStartedAt ? Date.now() - new Date(t.timerStartedAt).getTime() : 0;
      return {
        ...t,
        status: 'completed',
        timerStartedAt: null,
        actualEnd: now,
        accumulatedMs: (t.accumulatedMs || 0) + extraMs,
      };
    }));
    triggerComplete(id);
  }

  function completeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const now = new Date().toISOString();
    const extraMs = task.timerStartedAt ? Date.now() - new Date(task.timerStartedAt).getTime() : 0;
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        status: 'completed',
        timerStartedAt: null,
        actualEnd: t.actualEnd || now,
        accumulatedMs: (t.accumulatedMs || 0) + extraMs,
      };
    }));
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
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        newStreak = prev.lastCompletedDate === yesterday ? prev.streakDays + 1 : 1;
      }
      const newState = { ...prev, points: newPoints, completedCount: newCompleted, streakDays: newStreak, lastCompletedDate: todayStr };
      newState.badges = checkBadges(newState);
      return newState;
    });

    setShowConfetti(true);
    setPointsBadge({ amount: points, show: true });
    setTimeout(() => setPointsBadge(null), 2200);
  }

  function checkBadges(r) {
    const current = new Set(r.badges || []);
    const rules = [
      ['first_task', r.completedCount >= 1],
      ['five_tasks', r.completedCount >= 5],
      ['ten_tasks', r.completedCount >= 10],
      ['streak_3', r.streakDays >= 3],
      ['streak_7', r.streakDays >= 7],
      ['points_50', r.points >= 50],
      ['points_100', r.points >= 100],
      ['timer_5', r.timerUseCount >= 5],
      ['timer_20', r.timerUseCount >= 20],
    ];
    rules.forEach(([id, earned]) => { if (earned) current.add(id); });
    return [...current];
  }

  function openEdit(id) {
    setSelectedTaskId(id);
  }

  const VIEW_TITLES = {
    tasks: `Tasks`,
    timeline: 'Timeline',
    summary: 'Daily Summary',
    rewards: 'Rewards',
  };

  return (
    <div className="app">
      <Header selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <QuickAdd onAdd={addTask} />

      <div className="main-layout" style={{ flex: 1, overflow: 'hidden' }}>
        <Sidebar
          view={view}
          onViewChange={setView}
          filters={filters}
          onFiltersChange={setFilters}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Content header */}
          <div className="content-header">
            <div className="content-title">{VIEW_TITLES[view]}</div>
            {view === 'tasks' && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Main content */}
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

                {activeTasks.length > 0 && activeTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    tick={tick}
                    isActiveTimer={!!task.timerStartedAt}
                    onSelect={id => setSelectedTaskId(id === selectedTaskId ? null : id)}
                    onStart={startTimer}
                    onPause={pauseTimer}
                    onStop={stopTimer}
                    onComplete={completeTask}
                    onDelete={setDeleteConfirmId}
                    onEdit={openEdit}
                  />
                ))}

                {completedTasks.length > 0 && (
                  <>
                    <div className="section-divider">Completed</div>
                    {completedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        tick={tick}
                        isActiveTimer={false}
                        onSelect={id => setSelectedTaskId(id === selectedTaskId ? null : id)}
                        onStart={startTimer}
                        onPause={pauseTimer}
                        onStop={stopTimer}
                        onComplete={completeTask}
                        onDelete={setDeleteConfirmId}
                        onEdit={openEdit}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {view === 'timeline' && (
              <TimelineView
                tasks={dateTasks}
                tick={tick}
                onSelectTask={id => { setSelectedTaskId(id); setView('tasks'); }}
              />
            )}

            {view === 'summary' && <SummaryView tasks={dateTasks} />}
            {view === 'rewards' && <RewardsView rewards={rewards} />}
          </div>
        </div>

        <RightRail
          task={selectedTask}
          tick={tick}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={updateTask}
          onStart={startTimer}
          onPause={pauseTimer}
          onStop={stopTimer}
          onComplete={completeTask}
        />
      </div>

      <Footer tasks={dateTasks} />

      {/* Delete confirmation modal */}
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

      {/* Points badge */}
      {pointsBadge?.show && (
        <div className="points-badge" style={{ bottom: 80, right: 32 }}>
          +{pointsBadge.amount} pts
        </div>
      )}

      <Confetti show={showConfetti} onDone={() => setShowConfetti(false)} />
    </div>
  );
}
