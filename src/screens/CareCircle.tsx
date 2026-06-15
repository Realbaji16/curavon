import { motion } from 'framer-motion';
import { Heart, Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import { ScreenHeader } from '../components/ScreenHeader';

interface Member {
  id: string;
  name: string;
  relation: string;
  avatar: string;
  status: 'active' | 'missed' | 'nudge';
  statusLabel: string;
}

const MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Mom',
    relation: 'Parent',
    avatar: '👩',
    status: 'active',
    statusLabel: 'Active',
  },
  {
    id: '2',
    name: 'Alex',
    relation: 'Partner',
    avatar: '🧑',
    status: 'missed',
    statusLabel: 'Missed Check-In',
  },
  {
    id: '3',
    name: 'Jordan',
    relation: 'Sibling',
    avatar: '👦',
    status: 'nudge',
    statusLabel: 'Needs Nudge',
  },
  {
    id: '4',
    name: 'Sam',
    relation: 'Friend',
    avatar: '🧑‍🤝‍🧑',
    status: 'active',
    statusLabel: 'Active',
  },
];

const statusColors = {
  active: { bg: '#D8F3DC', text: '#40916C' },
  missed: { bg: '#FFE8DC', text: '#E07A5F' },
  nudge: { bg: '#FAECD8', text: '#C06040' },
};

export function CareCircleScreen() {
  const { theme, sendNudge } = useApp();
  const tokens = themes[theme];

  return (
    <div className="screen circle-screen">
      <ScreenHeader
        title="Care Circle"
        subtitle="Privacy-first family support"
      />

      <div
        className="circle-info-card"
        style={{
          background: tokens.accentSoft,
          border: `1px solid ${tokens.border}`,
          color: tokens.textSecondary,
        }}
      >
        <Heart size={18} />
        <span>Only shared milestones appear here — never raw symptom details.</span>
      </div>

      <div className="member-list">
        {MEMBERS.map((member, i) => {
          const colors = statusColors[member.status];
          return (
            <motion.div
              key={member.id}
              className="member-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                background: tokens.cardGradient,
                border: `1px solid ${tokens.border}`,
                boxShadow: tokens.shadow,
              }}
            >
              <div className="member-info">
                <span className="member-avatar">{member.avatar}</span>
                <div>
                  <p className="member-name" style={{ color: tokens.text }}>
                    {member.name}
                  </p>
                  <p className="member-relation" style={{ color: tokens.textMuted }}>
                    {member.relation}
                  </p>
                </div>
              </div>

              <span
                className="status-tag"
                style={{ background: colors.bg, color: colors.text }}
              >
                {member.statusLabel}
              </span>

              <motion.button
                className="nudge-btn"
                whileTap={{ scale: 0.95 }}
                onClick={() => sendNudge(member.id)}
                style={{
                  background: tokens.surfaceElevated,
                  border: `1.5px solid ${tokens.border}`,
                  color: tokens.primary,
                }}
              >
                <Bell size={16} />
                Send Support Nudge
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
