import { Flame } from 'lucide-react';
import { themes } from '../theme/themes';
import type { ThemePreset } from '../theme/themes';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

type DayState = 'completed' | 'today' | 'upcoming' | 'inactive';

function getMondayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

function getDayStates(streakCount: number, todayDone: boolean): DayState[] {
  const todayIndex = getMondayIndex();
  const states: DayState[] = [];

  for (let i = 0; i < 7; i++) {
    if (i > todayIndex) {
      states.push('upcoming');
    } else if (i === todayIndex) {
      states.push(todayDone ? 'completed' : 'today');
    } else {
      const daysAgo = todayIndex - i;
      const effectiveStreak = todayDone ? streakCount : Math.max(0, streakCount - 1);
      states.push(daysAgo < effectiveStreak ? 'completed' : 'inactive');
    }
  }

  return states;
}

interface StreakCardProps {
  streakCount: number;
  todayDone?: boolean;
  theme?: ThemePreset;
  className?: string;
}

export function StreakCard({
  streakCount,
  todayDone = false,
  theme = 'sky',
  className = '',
}: StreakCardProps) {
  const tokens = themes[theme];
  const dayStates = getDayStates(streakCount, todayDone);
  const title =
    streakCount === 1 ? '1 day streak' : `${streakCount} day streak`;

  return (
    <div
      className={`streak-card warm-card glass-card-inner ${className}`.trim()}
      style={{
        background: tokens.cardGradient,
        border: `1px solid ${tokens.glassBorder}`,
        boxShadow: tokens.shadowSoft,
      }}
    >
      <div className="streak-card-head">
        <div
          className="streak-icon-badge"
          style={{ background: tokens.primarySoft }}
          aria-hidden="true"
        >
          <Flame size={18} style={{ color: tokens.primary }} />
        </div>
        <div className="streak-card-copy">
          <h3 className="streak-title" style={{ color: tokens.text }}>
            {title}
          </h3>
          <p className="streak-subtitle" style={{ color: tokens.textMuted }}>
            Small steps, kept up gently
          </p>
        </div>
      </div>

      <div className="streak-week" role="list" aria-label="This week's activity">
        {DAY_LABELS.map((label, i) => {
          const state = dayStates[i];
          return (
            <div key={`${label}-${i}`} className="streak-day" role="listitem">
              <span className="streak-day-label" style={{ color: tokens.textMuted }}>
                {label}
              </span>
              <span
                className={`streak-dot streak-dot--${state}`}
                style={
                  state === 'completed'
                    ? { background: tokens.primary, boxShadow: `0 2px 8px ${tokens.primarySoft}` }
                    : state === 'today'
                      ? { borderColor: tokens.primary, background: 'rgba(255,255,255,0.5)' }
                      : undefined
                }
                aria-label={
                  state === 'completed'
                    ? `${label} completed`
                    : state === 'today'
                      ? `${label} today`
                      : state === 'upcoming'
                        ? `${label} upcoming`
                        : `${label} inactive`
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
