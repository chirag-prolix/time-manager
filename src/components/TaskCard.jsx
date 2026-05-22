import { useState, useRef, useEffect } from 'react';
import { formatMs, formatMinutes, getElapsedMs } from '../utils';

function PlayIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>;
}
function PauseIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>;
}
function StopIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
}
function CheckIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>;
}
function DotsIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>;
}

const STATUS_LABELS = {
  'planned': 'Planned',
  'in-progress': 'In Progress',
  'paused': 'Paused',
  'completed': 'Completed',
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function TaskCard({ task, isActiveTimer, tick, onSelect, onStart, onPause, onStop, onComplete, onDelete, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const elapsed = getElapsedMs(task);
  const isRunning = !!task.timerStartedAt;
  const isDone = task.status === 'completed';

  function handleCheckbox(e) {
    e.stopPropagation();
    if (!isDone) onComplete(task.id);
  }

  function handleStart(e) {
    e.stopPropagation();
    onStart(task.id);
  }

  function handlePause(e) {
    e.stopPropagation();
    onPause(task.id);
  }

  function handleStop(e) {
    e.stopPropagation();
    onStop(task.id);
  }

  return (
    <div
      className={`task-card${isRunning ? ' active-timer' : ''}${isDone ? ' completed' : ''}`}
      onClick={() => onSelect(task.id)}
    >
      <button
        className={`task-checkbox${isDone ? ' checked' : ''}`}
        onClick={handleCheckbox}
        title={isDone ? 'Completed' : 'Mark complete'}
      >
        {isDone && <CheckIcon />}
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className={`status-badge status-${task.status}`}>
            {STATUS_LABELS[task.status]}
          </span>
          {task.priority && (
            <span className={`priority-dot priority-${task.priority}`} title={task.priority} />
          )}
          {task.project && <span className="meta-text">{task.project}</span>}
          {task.estimatedDuration && (
            <span className="meta-text">est. {formatMinutes(task.estimatedDuration)}</span>
          )}
          {elapsed > 0 && (
            <span className={`timer-display${isRunning ? ' pulsing' : ''}`}>
              {formatMs(elapsed)}
            </span>
          )}
          {task.tags?.length > 0 && task.tags.slice(0, 2).map(tag => (
            <span key={tag} className="tag-chip">{tag}</span>
          ))}
        </div>
      </div>

      <div className="task-controls" onClick={e => e.stopPropagation()}>
        {!isDone && !isRunning && (
          <button className="icon-btn start" onClick={handleStart} title="Start timer">
            <PlayIcon />
          </button>
        )}
        {!isDone && isRunning && (
          <button className="icon-btn pause" onClick={handlePause} title="Pause timer">
            <PauseIcon />
          </button>
        )}
        {!isDone && (isRunning || task.status === 'paused') && (
          <button className="icon-btn stop" onClick={handleStop} title="Stop & complete">
            <StopIcon />
          </button>
        )}

        <div className="dropdown-wrapper" ref={menuRef}>
          <button
            className="icon-btn"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            title="More options"
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={() => { setMenuOpen(false); onEdit(task.id); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Edit
              </button>
              {!isDone && (
                <button className="dropdown-item" onClick={() => { setMenuOpen(false); onComplete(task.id); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  Mark Complete
                </button>
              )}
              <button className="dropdown-item danger" onClick={() => { setMenuOpen(false); onDelete(task.id); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
