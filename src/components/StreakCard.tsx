import { Flame } from 'lucide-react';
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
  className = '',
}: StreakCardProps) {
  const dayStates = getDayStates(streakCount, todayDone);
  const title =
    streakCount === 1 ? '1 day streak' : `${streakCount} day streak`;

  return (
    <div
      className={`streak-card warm-card glass-card-inner ${className}`.trim()}
    >
      <div className="streak-card-head">
        <div className="streak-icon-badge" aria-hidden="true">
          <Flame size={18} className="icon-warm" />
        </div>
        <div className="streak-card-copy">
          <h3 className="streak-title">{title}</h3>
          <p className="streak-subtitle">Small steps, kept up gently</p>
        </div>
      </div>

      <div className="streak-week" role="list" aria-label="This week's activity">
        {DAY_LABELS.map((label, i) => {
          const state = dayStates[i];
          return (
            <div key={`${label}-${i}`} className="streak-day" role="listitem">
              <span className="streak-day-label">{label}</span>
              <span
                className={`streak-dot streak-dot--${state}`}
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
