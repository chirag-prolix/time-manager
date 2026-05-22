export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function today() {
  return toDateString(new Date());
}

export function formatDisplayDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const t = today();
  if (dateStr === t) return 'Today';
  const yesterday = toDateString(new Date(Date.now() - 86400000));
  const tomorrow = toDateString(new Date(Date.now() + 86400000));
  if (dateStr === yesterday) return 'Yesterday';
  if (dateStr === tomorrow) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMs(ms) {
  if (!ms || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatMinutes(min) {
  if (!min || min <= 0) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function getElapsedMs(task) {
  const base = task.accumulatedMs || 0;
  if (task.timerStartedAt) {
    return base + (Date.now() - new Date(task.timerStartedAt).getTime());
  }
  return base;
}

export function msToMinutes(ms) {
  return Math.round(ms / 60000);
}

export function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function parseTags(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

const BAR_COLORS = [
  '#0EA5A4', '#3b82f6', '#8b5cf6', '#f97316', '#22c55e', '#ec4899', '#eab308',
];

export function getProjectColor(project, allProjects) {
  const idx = allProjects.indexOf(project);
  return BAR_COLORS[idx % BAR_COLORS.length];
}
