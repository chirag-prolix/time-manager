const ALL_BADGES = [
  { id: 'first_task', icon: '🎯', name: 'First Step', desc: 'Complete your first task', threshold: 1, field: 'completedCount' },
  { id: 'five_tasks', icon: '🌟', name: 'Getting Going', desc: 'Complete 5 tasks', threshold: 5, field: 'completedCount' },
  { id: 'ten_tasks', icon: '🔥', name: 'On Fire', desc: 'Complete 10 tasks', threshold: 10, field: 'completedCount' },
  { id: 'streak_3', icon: '📅', name: 'Consistent', desc: '3 day streak', threshold: 3, field: 'streakDays' },
  { id: 'streak_7', icon: '🗓️', name: 'Week Warrior', desc: '7 day streak', threshold: 7, field: 'streakDays' },
  { id: 'points_50', icon: '💎', name: 'Point Collector', desc: 'Earn 50 points', threshold: 50, field: 'points' },
  { id: 'points_100', icon: '🏆', name: 'Century', desc: 'Earn 100 points', threshold: 100, field: 'points' },
  { id: 'timer_5', icon: '⏱️', name: 'Time Keeper', desc: 'Use timer 5 times', threshold: 5, field: 'timerUseCount' },
  { id: 'timer_20', icon: '⌚', name: 'Clockwork', desc: 'Use timer 20 times', threshold: 20, field: 'timerUseCount' },
];

export default function RewardsView({ rewards }) {
  const { points = 0, streakDays = 0, completedCount = 0, timerUseCount = 0, badges = [] } = rewards;

  const stats = { points, streakDays, completedCount, timerUseCount };

  const earnedSet = new Set(badges);

  function isEarned(badge) {
    return earnedSet.has(badge.id);
  }

  const earnedCount = ALL_BADGES.filter(b => isEarned(b)).length;

  return (
    <div className="rewards-view">
      <div className="rewards-hero">
        <div className="rewards-points-circle">
          <div className="rewards-points-value">{points}</div>
          <div className="rewards-points-label">Points</div>
        </div>
        <div className="rewards-info">
          <h2>Your Progress</h2>
          <div className="rewards-streak">
            🔥 <strong>{streakDays}</strong> day streak
          </div>
          <div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>
            {completedCount} tasks completed · {earnedCount}/{ALL_BADGES.length} badges
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-title">Stats</div>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-value">{points}</div>
            <div className="metric-label">Total Points</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">{streakDays}</div>
            <div className="metric-label">Day Streak</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">{completedCount}</div>
            <div className="metric-label">Tasks Done</div>
          </div>
          <div className="metric-item">
            <div className="metric-value">{timerUseCount}</div>
            <div className="metric-label">Timer Uses</div>
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-title">Badges</div>
        <div className="badges-grid">
          {ALL_BADGES.map(badge => {
            const earned = isEarned(badge);
            const progress = Math.min(stats[badge.field] || 0, badge.threshold);
            const pct = Math.round((progress / badge.threshold) * 100);
            return (
              <div key={badge.id} className={`badge-item${earned ? ' earned' : ' locked'}`}>
                <div className="badge-icon" style={{ filter: earned ? 'none' : 'grayscale(1)' }}>
                  {badge.icon}
                </div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-desc">{badge.desc}</div>
                {!earned && (
                  <div style={{
                    width: '100%',
                    height: 4,
                    background: 'var(--gray-200)',
                    borderRadius: 2,
                    marginTop: 4,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'var(--teal)',
                      borderRadius: 2,
                    }} />
                  </div>
                )}
                {earned && (
                  <div style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 600 }}>✓ Earned</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
