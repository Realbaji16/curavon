import { Home, MessageCircle, GitBranch, Users, Settings } from 'lucide-react';
import { useApp, type TabId } from '../context/AppContext';
import { themes } from '../theme/themes';

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'ask', label: 'Ask Healthy', icon: MessageCircle },
  { id: 'flow', label: 'Full Flow', icon: GitBranch },
  { id: 'circle', label: 'Care Circle', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function TabBar() {
  const { activeTab, setActiveTab, theme } = useApp();
  const tokens = themes[theme];

  return (
    <nav
      className="tab-bar"
      style={{
        background: tokens.tabBar,
        borderTop: `1px solid ${tokens.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            className={`tab-item ${active ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              style={{ color: active ? tokens.primary : tokens.textMuted }}
            />
            <span
              className="tab-label"
              style={{ color: active ? tokens.primary : tokens.textMuted }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
