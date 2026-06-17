import { motion } from 'framer-motion';
import { Moon, Zap, Utensils, Heart, Sparkles, Stethoscope, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import { ScreenHeader } from '../components/ScreenHeader';
import { staggerContainer, fadeUp, tapScale } from '../motion/variants';

const CATEGORIES = ['All', 'Sleep', 'Energy', 'Habits', 'Care'];

const INSIGHTS = [
  {
    id: 'sleep',
    title: 'Sleep basics',
    desc: 'Gentle habits for more restful nights — no rigid rules.',
    icon: Moon,
    read: '4 min',
    category: 'Sleep',
  },
  {
    id: 'energy',
    title: 'Energy reset',
    desc: 'Small patterns that may help when afternoons feel heavy.',
    icon: Zap,
    read: '3 min',
    category: 'Energy',
  },
  {
    id: 'eating',
    title: 'Eating habits',
    desc: 'Mindful approaches to nourishment without guilt.',
    icon: Utensils,
    read: '5 min',
    category: 'Habits',
  },
  {
    id: 'stress',
    title: 'Stress support',
    desc: 'Calm tools for busy days and racing thoughts.',
    icon: Heart,
    read: '4 min',
    category: 'Habits',
  },
  {
    id: 'skin',
    title: 'Skin care basics',
    desc: 'Simple routines and when to track changes over time.',
    icon: Sparkles,
    read: '3 min',
    category: 'Habits',
  },
  {
    id: 'care',
    title: 'When to seek care',
    desc: 'Know when self-care is enough — and when to ask for help.',
    icon: Stethoscope,
    read: '5 min',
    category: 'Care',
  },
];

export function CareCircleScreen() {
  const { theme, showToast } = useApp();
  const tokens = themes[theme];

  return (
    <div className="screen learn-screen">
      <ScreenHeader title="Learn" subtitle="Calm insights for everyday health" />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="learn-intro warm-card glass-card-inner" variants={fadeUp}>
          <p style={{ lineHeight: 1.55, margin: 0 }}>
            Short guides to support your health flow — educational, not diagnostic. Always talk to a
            clinician about symptoms that worry you.
          </p>
        </motion.div>

        <motion.div className="learn-categories" variants={fadeUp}>
          {CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat}
              type="button"
              className={`learn-category-chip ${i === 0 ? 'learn-category-chip--active' : ''}`}
              {...tapScale}
              onClick={() => showToast(`Filter: ${cat}`)}
              style={{
                background: i === 0 ? tokens.primarySoft : tokens.glass,
                border: `1.5px solid ${i === 0 ? tokens.primary : tokens.border}`,
                color: i === 0 ? tokens.primary : tokens.text,
              }}
            >
              {cat}
            </motion.button>
          ))}
        </motion.div>

        <div className="insight-grid">
          {INSIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                type="button"
                className="insight-card warm-card glass-card-inner"
                variants={fadeUp}
                whileTap={{ scale: 0.98 }}
                onClick={() => showToast(`Opening: ${item.title}`)}
                style={{ textAlign: 'left' }}
              >
                <div className="insight-icon-wrap">
                  <Icon size={22} className="icon-warm" />
                </div>
                <h3 style={{ margin: '10px 0 4px', fontSize: 16 }}>{item.title}</h3>
                <p>{item.desc}</p>
                <div className="insight-footer">
                  <span className="progress-pill progress-pill--teal">{item.read}</span>
                  <ChevronRight size={16} className="icon-muted" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
