import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Lock, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes, type ThemeTokens } from '../theme/themes';
import { ScreenHeader } from '../components/ScreenHeader';

type PhaseStatus = 'completed' | 'active' | 'locked';

interface Phase {
  id: string;
  days: string;
  title: string;
  description: string;
  status: PhaseStatus;
  tasks: string[];
}

const PHASES: Phase[] = [
  {
    id: '1',
    days: 'Day 1–3',
    title: 'Gentle Routine Reset',
    description: 'Establish baseline habits with low-friction daily actions.',
    status: 'completed',
    tasks: ['Morning hydration ritual', '5-min gentle stretch', 'Sleep wind-down routine'],
  },
  {
    id: '2',
    days: 'Day 4–5',
    title: 'Trigger Evaluation',
    description: 'Identify patterns and potential triggers affecting your goals.',
    status: 'active',
    tasks: ['Log daily skin observations', 'Track sleep quality', 'Note food & stress patterns'],
  },
  {
    id: '3',
    days: 'Day 6–7',
    title: 'Lifestyle Adjustments',
    description: 'Apply personalized micro-changes based on your data.',
    status: 'locked',
    tasks: ['Adjust evening routine', 'Introduce targeted nutrition tweak', 'Review weekly wins'],
  },
];

const StatusIcon = ({ status, tokens }: { status: PhaseStatus; tokens: ThemeTokens }) => {
  if (status === 'completed') return <CheckCircle2 size={20} style={{ color: tokens.success }} />;
  if (status === 'active') return <Sparkles size={20} style={{ color: tokens.primary }} />;
  return <Lock size={18} style={{ color: tokens.textMuted }} />;
};

export function FullFlowScreen() {
  const { theme, flowView, setFlowView } = useApp();
  const tokens = themes[theme];

  return (
    <div className="screen flow-screen">
      <ScreenHeader title="Full Flow" subtitle="Your 7-day health journey" />

      <div
        className="segment-control"
        style={{
          background: tokens.surfaceElevated,
          border: `1px solid ${tokens.border}`,
        }}
      >
        {(['timeline', 'daily'] as const).map((view) => (
          <button
            key={view}
            className={`segment-btn ${flowView === view ? 'active' : ''}`}
            onClick={() => setFlowView(view)}
            style={{
              background: flowView === view ? tokens.surface : 'transparent',
              color: flowView === view ? tokens.primary : tokens.textMuted,
              boxShadow: flowView === view ? tokens.shadow : 'none',
            }}
          >
            {view === 'timeline' ? 'Timeline' : 'Daily Action'}
          </button>
        ))}
      </div>

      {flowView === 'daily' ? (
        <motion.div
          className="daily-redirect-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: tokens.heroGradient,
            boxShadow: tokens.shadow,
            color: '#fff',
          }}
        >
          <h3>Today's Focus</h3>
          <p>Hydrate with 500ml of water and stretch for 5 minutes</p>
          <p className="daily-hint">Switch to Home tab for full interactivity</p>
        </motion.div>
      ) : (
        <div className="timeline-track">
          {PHASES.map((phase, index) => (
            <motion.div
              key={phase.id}
              className="timeline-node"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
            >
              <div className="timeline-rail">
                <div
                  className={`node-dot ${phase.status}`}
                  style={{
                    background:
                      phase.status === 'completed'
                        ? tokens.success
                        : phase.status === 'active'
                          ? tokens.primary
                          : tokens.border,
                    border: `3px solid ${tokens.surface}`,
                    boxShadow:
                      phase.status === 'active'
                        ? `0 0 0 4px ${tokens.primarySoft}`
                        : 'none',
                  }}
                >
                  <StatusIcon status={phase.status} tokens={tokens} />
                </div>
                {index < PHASES.length - 1 && (
                  <div
                    className="rail-line"
                    style={{
                      background:
                        phase.status === 'completed'
                          ? tokens.success
                          : tokens.border,
                    }}
                  />
                )}
              </div>

              <div
                className={`phase-card ${phase.status}`}
                style={{
                  background: tokens.cardGradient,
                  border: `1px solid ${phase.status === 'active' ? tokens.primary : tokens.border}`,
                  boxShadow: phase.status === 'active' ? tokens.shadow : 'none',
                  opacity: phase.status === 'locked' ? 0.65 : 1,
                }}
              >
                <div className="phase-header">
                  <span
                    className="phase-days"
                    style={{
                      background: tokens.primarySoft,
                      color: tokens.primary,
                    }}
                  >
                    {phase.days}
                  </span>
                  <span
                    className={`status-badge ${phase.status}`}
                    style={{
                      background:
                        phase.status === 'completed'
                          ? tokens.accentSoft
                          : phase.status === 'active'
                            ? tokens.primarySoft
                            : tokens.surfaceElevated,
                      color:
                        phase.status === 'completed'
                          ? tokens.success
                          : phase.status === 'active'
                            ? tokens.primary
                            : tokens.textMuted,
                    }}
                  >
                    {phase.status === 'completed'
                      ? 'Completed'
                      : phase.status === 'active'
                        ? 'Active'
                        : 'Locked'}
                  </span>
                </div>
                <h3 style={{ color: tokens.text, margin: '8px 0 4px' }}>{phase.title}</h3>
                <p style={{ color: tokens.textMuted, fontSize: 14, margin: '0 0 12px' }}>
                  {phase.description}
                </p>
                <ul className="phase-tasks">
                  {phase.tasks.map((task) => (
                    <li key={task} style={{ color: tokens.textSecondary }}>
                      <Circle size={8} fill={tokens.primary} stroke="none" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
