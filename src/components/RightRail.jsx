import { useState, useEffect } from 'react';
import { formatMs, formatMinutes, formatTime, getElapsedMs, parseTags } from '../utils';

const PRIORITIES = ['low', 'medium', 'high'];
const STATUS_OPTIONS = ['planned', 'in-progress', 'paused', 'completed'];

function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}

export default function RightRail({ task, tick, onClose, onUpdate, onStart, onPause, onStop, onComplete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [editTime, setEditTime] = useState(false);
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        project: task.project || '',
        priority: task.priority || 'medium',
        estimatedDuration: task.estimatedDuration || '',
        tags: (task.tags || []).join(', '),
        location: task.location || '',
        status: task.status,
      });
      setEditing(false);
      setEditTime(false);
    }
  }, [task?.id]);

  if (!task) return null;

  const isRunning = !!task.timerStartedAt;
  const isDone = task.status === 'completed';
  const elapsed = getElapsedMs(task);

  function saveForm() {
    onUpdate(task.id, {
      ...form,
      estimatedDuration: form.estimatedDuration ? parseInt(form.estimatedDuration, 10) : null,
      tags: parseTags(form.tags),
    });
    setEditing(false);
  }

  function saveTime() {
    const updates = {};
    if (manualStart) updates.actualStart = new Date(manualStart).toISOString();
    if (manualEnd) {
      updates.actualEnd = new Date(manualEnd).toISOString();
      if (manualStart) {
        const ms = new Date(manualEnd) - new Date(manualStart);
        if (ms > 0) updates.accumulatedMs = ms;
      }
    }
    onUpdate(task.id, updates);
    setEditTime(false);
  }

  return (
    <div className="right-rail">
      <div className="rail-header">
        <span className="rail-title">Task Details</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {!editing && (
            <button className="icon-btn" onClick={() => setEditing(true)} title="Edit task">
              <EditIcon />
            </button>
          )}
          <button className="icon-btn" onClick={onClose} title="Close">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="rail-body">
        {editing ? (
          <>
            <div className="field-group">
              <label className="field-label">Title</label>
              <input className="field-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Description</label>
              <textarea className="field-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Project</label>
              <input className="field-input" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="field-group">
                <label className="field-label">Priority</label>
                <select className="field-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Status</label>
                <select className="field-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Est. Duration (min)</label>
              <input className="field-input" type="number" min="1" value={form.estimatedDuration} onChange={e => setForm(f => ({ ...f, estimatedDuration: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Tags</label>
              <input className="field-input" placeholder="tag1, tag2" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Location</label>
              <input className="field-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={saveForm}>Save</button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{task.title}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={`status-badge status-${task.status}`}>{task.status}</span>
                {task.priority && <span className={`status-badge priority-${task.priority}`} style={{ textTransform: 'capitalize' }}>{task.priority}</span>}
              </div>
            </div>

            {task.description && (
              <div className="field-group">
                <label className="field-label">Description</label>
                <div className="field-value" style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{task.description}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {task.project && (
                <div className="field-group">
                  <label className="field-label">Project</label>
                  <div className="field-value">{task.project}</div>
                </div>
              )}
              {task.estimatedDuration && (
                <div className="field-group">
                  <label className="field-label">Est. Duration</label>
                  <div className="field-value">{formatMinutes(task.estimatedDuration)}</div>
                </div>
              )}
            </div>

            {task.tags?.length > 0 && (
              <div className="field-group">
                <label className="field-label">Tags</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {task.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
                </div>
              </div>
            )}

            {task.location && (
              <div className="field-group">
                <label className="field-label">Location</label>
                <div className="field-value">{task.location}</div>
              </div>
            )}

            {/* Timer section */}
            <div className="rail-timer-section">
              <div className="rail-timer-display" style={{ color: isRunning ? 'var(--blue)' : 'var(--gray-800)' }}>
                {formatMs(elapsed)}
              </div>
              {task.actualStart && (
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                  Started {formatTime(task.actualStart)}
                  {task.actualEnd && ` → ${formatTime(task.actualEnd)}`}
                </div>
              )}
              <div className="rail-timer-controls">
                {!isDone && !isRunning && (
                  <button className="timer-btn start-btn" onClick={() => onStart(task.id)}>
                    ▶ {task.status === 'paused' ? 'Resume' : 'Start'}
                  </button>
                )}
                {!isDone && isRunning && (
                  <button className="timer-btn pause-btn" onClick={() => onPause(task.id)}>
                    ⏸ Pause
                  </button>
                )}
                {!isDone && (isRunning || task.status === 'paused') && (
                  <button className="timer-btn stop-btn" onClick={() => onStop(task.id)}>
                    ⏹ Stop
                  </button>
                )}
                {!isDone && (
                  <button className="timer-btn complete-btn" onClick={() => onComplete(task.id)}>
                    ✓ Done
                  </button>
                )}
              </div>
            </div>

            {/* Manual time entry */}
            <div className="edit-time-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="edit-time-title">Manual Time Entry</div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => setEditTime(v => !v)}
                >
                  {editTime ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editTime && (
                <>
                  <div className="time-inputs" style={{ marginTop: 8 }}>
                    <div className="field-group">
                      <label className="field-label">Start</label>
                      <input className="field-input" type="datetime-local" value={manualStart} onChange={e => setManualStart(e.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">End</label>
                      <input className="field-input" type="datetime-local" value={manualEnd} onChange={e => setManualEnd(e.target.value)} />
                    </div>
                  </div>
                  <button className="btn-primary save-btn" onClick={saveTime}>Save Time</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
