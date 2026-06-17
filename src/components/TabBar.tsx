import { motion } from 'framer-motion';
import {
  Sun,
  MessageCircle,
  GitBranch,
  BookOpen,
  User,
} from 'lucide-react';
import { useApp, type TabId } from '../context/AppContext';
import { themes } from '../theme/themes';
import { tapScale } from '../motion/variants';

const TABS: { id: TabId; label: string; icon: typeof Sun }[] = [
  { id: 'home', label: 'Today', icon: Sun },
  { id: 'ask', label: 'Ask', icon: MessageCircle },
  { id: 'flow', label: 'Flow', icon: GitBranch },
  { id: 'circle', label: 'Learn', icon: BookOpen },
  { id: 'settings', label: 'Profile', icon: User },
];

export function TabBar() {
  const { activeTab, setActiveTab, theme } = useApp();
  const tokens = themes[theme];

  return (
    <div className="tab-bar-wrap">
      <nav className="tab-bar glass-card">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <motion.button
              key={id}
              type="button"
              className={`tab-item ${active ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              {...tapScale}
            >
              {active && (
                <motion.span
                  className="tab-active-pill"
                  layoutId="tab-pill"
                  style={{ background: tokens.primarySoft }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <motion.span
                className="tab-icon-wrap"
                animate={{ scale: active ? 1.08 : 1 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 1.75}
                  className="tab-icon"
                  style={{ color: active ? tokens.primary : tokens.textMuted }}
                />
              </motion.span>
              <motion.span
                className="tab-label"
                animate={{ opacity: active ? 1 : 0.72 }}
                transition={{ duration: 0.18 }}
                style={{ color: active ? tokens.primary : tokens.textMuted }}
              >
                {label}
              </motion.span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
