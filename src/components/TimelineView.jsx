import { getElapsedMs, formatMs, formatTime } from '../utils';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm

function getTaskHourSlots(task) {
  if (!task.actualStart) return [];

  const startMs = new Date(task.actualStart).getTime();
  const durationMs = getElapsedMs(task) || 0;
  const endMs = task.actualEnd
    ? new Date(task.actualEnd).getTime()
    : durationMs > 0 ? startMs + durationMs : startMs + 60000;

  const startHour = new Date(startMs).getHours();
  const endHour = new Date(endMs).getHours();

  const slots = new Set();
  for (let h = startHour; h <= endHour; h++) {
    slots.add(h);
  }
  return [...slots];
}

const STATUS_BLOCK_CLASS = {
  'planned': '',
  'in-progress': 'in-progress-block',
  'paused': 'paused-block',
  'completed': 'completed-block',
};

export default function TimelineView({ tasks, tick, onSelectTask }) {
  const tasksWithTime = tasks.filter(t => t.actualStart);
  const tasksNoTime = tasks.filter(t => !t.actualStart);

  // Build hour → tasks map
  const hourMap = {};
  HOURS.forEach(h => { hourMap[h] = []; });
  tasksWithTime.forEach(task => {
    const slots = getTaskHourSlots(task);
    slots.forEach(h => {
      if (hourMap[h]) hourMap[h].push(task);
    });
  });

  const hasAnyTimer = tasksWithTime.length > 0;

  return (
    <div style={{ padding: '16px', overflowY: 'auto' }}>
      {!hasAnyTimer && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <div className="empty-state-title">No timed tasks yet</div>
          <div className="empty-state-sub">Start a timer on any task to see it here</div>
        </div>
      )}

      {hasAnyTimer && (
        <div className="timeline-view">
          {HOURS.map(h => {
            const hourTasks = hourMap[h] || [];
            const label = h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;
            return (
              <div key={h} className="timeline-row">
                <div className="timeline-hour">{label}</div>
                <div className="timeline-col">
                  {hourTasks.map(task => (
                    <div
                      key={task.id}
                      className={`timeline-block ${STATUS_BLOCK_CLASS[task.status] || ''}`}
                      onClick={() => onSelectTask(task.id)}
                      title={task.title}
                    >
                      <div className="timeline-block-title">{task.title}</div>
                      <div className="timeline-block-time">
                        {formatTime(task.actualStart)}
                        {task.actualEnd && ` → ${formatTime(task.actualEnd)}`}
                        {getElapsedMs(task) > 0 && ` (${formatMs(getElapsedMs(task))})`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tasksNoTime.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="section-divider">Unscheduled Tasks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {tasksNoTime.map(task => (
              <div
                key={task.id}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius)',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                }}
                onClick={() => onSelectTask(task.id)}
              >
                <span className={`status-badge status-${task.status}`}>{task.status}</span>
                <span>{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
