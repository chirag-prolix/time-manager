import { useState } from 'react';

function Icon({ path, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: 'tasks', label: 'Today', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'timeline', label: 'Timeline', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { id: 'summary', label: 'Summary', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'rewards', label: 'Rewards', icon: 'M5 3l3 3M19 3l-3 3M12 22V10m0 0l-3-3m3 3l3-3M3 9h18M5 9v3a7 7 0 0014 0V9' },
];

const STATUSES = ['planned', 'in-progress', 'paused', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];

export default function Sidebar({ view, onViewChange, filters, onFiltersChange }) {
  const [collapsed, setCollapsed] = useState(false);

  function toggleStatus(s) {
    const current = filters.statuses || [];
    const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s];
    onFiltersChange({ ...filters, statuses: next });
  }

  function togglePriority(p) {
    const current = filters.priorities || [];
    const next = current.includes(p) ? current.filter(x => x !== p) : [...current, p];
    onFiltersChange({ ...filters, priorities: next });
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Expand' : 'Collapse'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {collapsed
            ? <polyline points="9 18 15 12 9 6" />
            : <polyline points="15 18 9 12 15 6" />}
        </svg>
      </button>

      <div className="nav-section-title">Views</div>
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`nav-item${view === item.id ? ' active' : ''}`}
          onClick={() => onViewChange(item.id)}
          title={item.label}
        >
          <Icon path={item.icon} />
          <span className="nav-label">{item.label}</span>
        </button>
      ))}

      {!collapsed && (
        <>
          <div className="nav-divider" />
          <div className="filter-section">
            <div className="filter-title">Filters</div>

            <div className="filter-group">
              <div className="filter-group-label">Status</div>
              <div className="filter-chips">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    className={`filter-chip${(filters.statuses || []).includes(s) ? ' active' : ''}`}
                    onClick={() => toggleStatus(s)}
                  >
                    {s === 'in-progress' ? 'Active' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-group-label">Priority</div>
              <div className="filter-chips">
                {PRIORITIES.map(p => (
                  <button
                    key={p}
                    className={`filter-chip${(filters.priorities || []).includes(p) ? ' active' : ''}`}
                    onClick={() => togglePriority(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-group-label">Sort by</div>
              <select
                className="sort-select"
                value={filters.sortBy || 'createdAt-desc'}
                onChange={e => onFiltersChange({ ...filters, sortBy: e.target.value })}
              >
                <option value="createdAt-desc">Newest first</option>
                <option value="createdAt-asc">Oldest first</option>
                <option value="priority-desc">High priority first</option>
                <option value="status">By status</option>
                <option value="title-asc">A–Z</option>
              </select>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
