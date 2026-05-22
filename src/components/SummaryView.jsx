import { getElapsedMs, formatMs, msToMinutes, getProjectColor } from '../utils';

export default function SummaryView({ tasks }) {
  const completed = tasks.filter(t => t.status === 'completed');
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completed.length / totalTasks) * 100) : 0;

  const totalWorkMs = tasks.reduce((sum, t) => sum + getElapsedMs(t), 0);
  const plannedMs = tasks
    .filter(t => t.estimatedDuration)
    .reduce((sum, t) => sum + getElapsedMs(t), 0);
  const unplannedMs = tasks
    .filter(t => !t.estimatedDuration)
    .reduce((sum, t) => sum + getElapsedMs(t), 0);

  // Project breakdown
  const projectMap = {};
  tasks.forEach(t => {
    const key = t.project || 'Uncategorized';
    if (!projectMap[key]) projectMap[key] = 0;
    projectMap[key] += getElapsedMs(t);
  });

  const projectEntries = Object.entries(projectMap)
    .sort((a, b) => b[1] - a[1]);
  const allProjects = projectEntries.map(([k]) => k);
  const maxMs = projectEntries[0]?.[1] || 1;

  // Status breakdown
  const statusCounts = {
    planned: tasks.filter(t => t.status === 'planned').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    paused: tasks.filter(t => t.status === 'paused').length,
    completed: completed.length,
  };

  if (tasks.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 60 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <div className="empty-state-title">No data for this day</div>
        <div className="empty-state-sub">Add and complete tasks to see your summary</div>
      </div>
    );
  }

  return (
    <div className="summary-view">
      <div className="summary-card">
        <div className="summary-card-title">Daily Overview</div>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-value">{formatMs(totalWorkMs)}</div>
            <div className="metric-label">Total Work Time</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">{completionRate}%</div>
            <div className="metric-label">Completion Rate</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">{completed.length}</div>
            <div className="metric-label">Tasks Completed</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">{totalTasks}</div>
            <div className="metric-label">Total Tasks</div>
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-title">Status Breakdown</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="metric-item" style={{ flex: '1 1 80px' }}>
              <div className="metric-value" style={{ fontSize: 18 }}>{count}</div>
              <div className="metric-label" style={{ textTransform: 'capitalize' }}>
                {status === 'in-progress' ? 'Active' : status}
              </div>
              <span className={`status-badge status-${status}`} style={{ marginTop: 4 }}>
                {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {projectEntries.length > 0 && (
        <div className="summary-card">
          <div className="summary-card-title">Time by Project</div>
          <div className="project-bars">
            {projectEntries.map(([project, ms]) => {
              const color = getProjectColor(project, allProjects);
              const pct = Math.round((ms / maxMs) * 100);
              return (
                <div key={project} className="project-bar-item">
                  <div className="project-bar-header">
                    <span className="project-bar-name">{project}</span>
                    <span className="project-bar-time">{formatMs(ms)}</span>
                  </div>
                  <div className="project-bar-bg">
                    <div
                      className="project-bar-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="summary-card">
        <div className="summary-card-title">Planned vs Unplanned</div>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-value">{formatMs(plannedMs)}</div>
            <div className="metric-label">Planned Tasks</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">{formatMs(unplannedMs)}</div>
            <div className="metric-label">Unplanned Tasks</div>
          </div>
        </div>
      </div>
    </div>
  );
}
