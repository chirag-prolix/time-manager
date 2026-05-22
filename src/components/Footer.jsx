import { getElapsedMs, formatMs } from '../utils';

export default function Footer({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const totalWorkMs = tasks.reduce((sum, t) => sum + getElapsedMs(t), 0);

  return (
    <footer className="footer">
      <div className="progress-bar-wrapper">
        <div className="progress-label">
          <span>Daily Progress</span>
          <span>{completed}/{total} tasks · {completionRate}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${completionRate}%` }} />
        </div>
      </div>
      <div className="footer-stats">
        <div className="stat-item">
          <div className="stat-value">{formatMs(totalWorkMs)}</div>
          <div className="stat-label">Worked</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{inProgress}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{completed}</div>
          <div className="stat-label">Done</div>
        </div>
      </div>
    </footer>
  );
}
