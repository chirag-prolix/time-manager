import { formatDisplayDate, toDateString } from '../utils';

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function Header({ selectedDate, onDateChange }) {
  function shift(delta) {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    onDateChange(toDateString(d));
  }

  return (
    <header className="header">
      <div className="header-logo">
        <ClockIcon />
        <span>TimeFlow</span>
      </div>

      <div className="date-selector">
        <button className="date-btn" onClick={() => shift(-1)} title="Previous day">
          <ChevronLeft />
        </button>
        <span className="date-display">{formatDisplayDate(selectedDate)}</span>
        <button className="date-btn" onClick={() => shift(1)} title="Next day">
          <ChevronRight />
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
    </header>
  );
}
