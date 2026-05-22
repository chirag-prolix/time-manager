import { formatDisplayDate, toDateString } from '../utils';

export default function Header({ selectedDate, onDateChange, user, onLogout }) {
  function shift(delta) {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    onDateChange(toDateString(d));
  }

  return (
    <header className="header">
      <div className="header-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>TimeFlow</span>
      </div>

      <div className="date-selector">
        <button className="date-btn" onClick={() => shift(-1)} title="Previous day">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="date-display">{formatDisplayDate(selectedDate)}</span>
        <button className="date-btn" onClick={() => shift(1)} title="Next day">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={e => onDateChange(e.target.value)}
          style={{
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 6px',
            fontSize: '12px',
            color: 'var(--gray-600)',
            background: 'var(--gray-50)',
            outline: 'none',
            marginLeft: '4px',
          }}
        />
      </div>

      {/* User info + logout */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--teal)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {user.email?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 12, color: 'var(--gray-500)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </span>
          <button
            className="btn-secondary"
            onClick={onLogout}
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
