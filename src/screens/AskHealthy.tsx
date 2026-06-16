import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Shield, ChevronLeft, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import { ScreenHeader, SensitiveBlur } from '../components/ScreenHeader';
import { ShareSheet } from '../components/BottomSheets';
import { DoctorSummary } from '../components/DoctorSummary';
import { TypingDots } from '../components/TypingDots';
import {
  fadeUp,
  staggerContainer,
  bubbleIn,
  chipStagger,
  softPageTransition,
  tapScale,
} from '../motion/variants';

const CONCERN_CHIPS = [
  'Sleep',
  'Low energy',
  'Stress',
  'Eating habits',
  'Skin concern',
  'General wellness',
];

const INTAKE_QUESTIONS = [
  {
    id: 'duration',
    question: 'How long has this been happening?',
    options: ['Today', 'A few days', 'More than a week', 'Comes and goes'],
  },
  {
    id: 'pattern',
    question: 'When do you notice it most?',
    options: ['Morning', 'Afternoon', 'Evening', 'Varies'],
  },
  {
    id: 'change',
    question: 'Any recent changes to routine?',
    options: ['Sleep', 'Diet', 'Stress level', 'Nothing major'],
  },
];

const RECENT_CONCERNS = [
  { label: 'Evening energy dip', when: '2 days ago' },
  { label: 'Sleep routine', when: 'Last week' },
];

type AskMode = 'landing' | 'intake' | 'chat';

export function AskHealthyScreen() {
  const { theme, chatMessages, addChatMessage, showSafetyEscalation } = useApp();
  const tokens = themes[theme];
  const [mode, setMode] = useState<AskMode>('landing');
  const [intakeStep, setIntakeStep] = useState(0);
  const [intakeAnswers, setIntakeAnswers] = useState<string[]>([]);
  const [concern, setConcern] = useState('');
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showSafetyEscalation, mode]);

  useEffect(() => {
    if (mode !== 'chat') return;
    const last = chatMessages[chatMessages.length - 1];
    if (last?.role === 'user') {
      setIsTyping(true);
      const t = setTimeout(() => setIsTyping(false), 900);
      return () => clearTimeout(t);
    }
  }, [chatMessages, mode]);

  const startIntake = (text: string) => {
    setConcern(text);
    setMode('intake');
    setIntakeStep(0);
    setIntakeAnswers([]);
  };

  const selectIntakeOption = (option: string) => {
    const next = [...intakeAnswers, option];
    setIntakeAnswers(next);
    if (intakeStep < INTAKE_QUESTIONS.length - 1) {
      setIntakeStep(intakeStep + 1);
    } else {
      setMode('chat');
      addChatMessage(concern);
    }
  };

  const send = () => {
    if (!input.trim()) return;
    if (mode === 'landing') {
      startIntake(input.trim());
      setInput('');
      return;
    }
    addChatMessage(input.trim());
    setInput('');
  };

  if (showSafetyEscalation) {
    return <SafetyEscalation />;
  }

  if (mode === 'intake') {
    const q = INTAKE_QUESTIONS[intakeStep];
    const progress = ((intakeStep + 1) / INTAKE_QUESTIONS.length) * 100;
    return (
      <div className="screen intake-screen">
        <ScreenHeader title="Guided intake" subtitle="One question at a time" showThemeToggle={false} />
        <div className="intake-progress">
          <div className="intake-progress-bar" style={{ background: tokens.border }}>
            <motion.div
              className="intake-progress-fill"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              style={{ background: tokens.teal }}
            />
          </div>
          <span style={{ color: tokens.textMuted, fontSize: 12 }}>
            Step {intakeStep + 1} of {INTAKE_QUESTIONS.length}
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={intakeStep}
            className="intake-card warm-card glass-card-inner"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: tokens.cardGradient,
              border: `1px solid ${tokens.glassBorder}`,
              boxShadow: tokens.shadowSoft,
            }}
          >
            <p className="intake-concern-label" style={{ color: tokens.textMuted }}>Your concern</p>
            <p className="intake-concern" style={{ color: tokens.text }}>
              <SensitiveBlur sensitive>{concern}</SensitiveBlur>
            </p>
            <h2 className="intake-question" style={{ color: tokens.text }}>{q.question}</h2>
            <div className="intake-options">
              {q.options.map((opt, i) => (
                <motion.button
                  key={opt}
                  type="button"
                  className="intake-option soft-button"
                  custom={i}
                  variants={chipStagger}
                  initial="hidden"
                  animate="visible"
                  {...tapScale}
                  onClick={() => selectIntakeOption(opt)}
                  style={{
                    background: tokens.glass,
                    border: `1.5px solid ${tokens.border}`,
                    color: tokens.text,
                  }}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="intake-nav">
          {intakeStep > 0 && (
            <motion.button
              type="button"
              className="ghost-button"
              {...tapScale}
              onClick={() => {
                setIntakeStep(intakeStep - 1);
                setIntakeAnswers(intakeAnswers.slice(0, -1));
              }}
              style={{ color: tokens.textSecondary }}
            >
              <ChevronLeft size={18} />
              Back
            </motion.button>
          )}
        </div>
        <p className="intake-note" style={{ color: tokens.textMuted }}>
          Red-flag check runs before your health flow is created.
        </p>
      </div>
    );
  }

  return (
    <div className="screen chat-screen">
      <ScreenHeader title="Ask" subtitle="Guided intake — not a diagnosis" />

      <AnimatePresence mode="wait">
        {mode === 'landing' && (
          <motion.div
            key="landing"
            initial={softPageTransition.initial}
            animate={softPageTransition.animate}
            exit={softPageTransition.exit}
          >
            <motion.div
              className="ask-welcome-card warm-card glass-card-inner"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              style={{
                background: tokens.cardGradient,
                border: `1px solid ${tokens.glassBorder}`,
                boxShadow: tokens.shadowSoft,
              }}
            >
              <p style={{ color: tokens.text, lineHeight: 1.5, margin: 0 }}>
                Tell us what&apos;s on your mind. We&apos;ll ask a few gentle questions, check for urgent
                signs, and help you choose a safe next step.
              </p>
            </motion.div>

            <p className="chip-label" style={{ color: tokens.textMuted }}>Common concerns</p>
            <motion.div className="concern-chips" variants={staggerContainer} initial="hidden" animate="visible">
              {CONCERN_CHIPS.map((c, i) => (
                <motion.button
                  key={c}
                  type="button"
                  className="goal-chip"
                  custom={i}
                  variants={chipStagger}
                  {...tapScale}
                  onClick={() => startIntake(c)}
                  style={{
                    background: tokens.glass,
                    border: `1.5px solid ${tokens.border}`,
                    color: tokens.text,
                  }}
                >
                  {c}
                </motion.button>
              ))}
            </motion.div>

            {RECENT_CONCERNS.length > 0 && (
              <>
                <p className="chip-label" style={{ color: tokens.textMuted }}>Recent</p>
                <motion.div className="recent-concerns" variants={staggerContainer} initial="hidden" animate="visible">
                  {RECENT_CONCERNS.map((r, i) => (
                    <motion.button
                      key={r.label}
                      type="button"
                      className="recent-concern-card warm-card glass-card-inner"
                      custom={i}
                      variants={chipStagger}
                      {...tapScale}
                      onClick={() => startIntake(r.label)}
                      style={{
                        background: tokens.cardGradient,
                        border: `1px solid ${tokens.glassBorder}`,
                      }}
                    >
                      <span style={{ color: tokens.text }}>{r.label}</span>
                      <span style={{ color: tokens.textMuted, fontSize: 12 }}>{r.when}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {mode === 'chat' && (
          <motion.div
            key="chat"
            className="chat-messages"
            initial={softPageTransition.initial}
            animate={softPageTransition.animate}
            exit={softPageTransition.exit}
          >
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                className={`chat-bubble ${msg.role}`}
                variants={bubbleIn}
                initial="hidden"
                animate="visible"
                style={
                  msg.role === 'user'
                    ? { background: tokens.primary, color: '#fff', alignSelf: 'flex-end' }
                    : {
                        background: tokens.glass,
                        color: tokens.text,
                        border: `1px solid ${tokens.glassBorder}`,
                        alignSelf: 'flex-start',
                      }
                }
              >
                <SensitiveBlur sensitive={msg.role === 'user'}>{msg.text}</SensitiveBlur>
              </motion.div>
            ))}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  className="chat-bubble assistant typing-bubble"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background: tokens.glass,
                    border: `1px solid ${tokens.glassBorder}`,
                    alignSelf: 'flex-start',
                  }}
                >
                  <TypingDots />
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="safety-note safety-card"
        style={{
          background: tokens.accentSoft,
          border: `1px solid ${tokens.border}`,
          color: tokens.textSecondary,
        }}
      >
        <Shield size={16} />
        <span>
          Healthy.AI does not diagnose. It helps you organize what&apos;s happening and choose a safe next step.
        </span>
      </div>

      <div
        className={`chat-input-bar glass-card ${inputFocused ? 'chat-input-bar--focused' : ''}`}
        style={{
          background: tokens.glass,
          border: `1px solid ${inputFocused ? tokens.primary : tokens.glassBorder}`,
          boxShadow: inputFocused ? `0 0 0 3px ${tokens.primarySoft}` : 'none',
        }}
      >
        <input
          type="text"
          className="chat-input"
          placeholder={mode === 'landing' ? 'Describe your concern...' : 'Add a detail...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          style={{
            background: 'transparent',
            border: 'none',
            color: tokens.text,
          }}
        />
        <motion.button
          type="button"
          className="send-btn"
          {...tapScale}
          onClick={send}
          style={{ background: tokens.primary }}
        >
          <Send size={20} color="#fff" />
        </motion.button>
      </div>
    </div>
  );
}

function SafetyEscalation() {
  const { theme, resetChat, openShareSheet } = useApp();
  const tokens = themes[theme];
  const [understood, setUnderstood] = useState(false);

  return (
    <div className="screen safety-screen safety-screen--calm">
      <ScreenHeader title="Safety check" subtitle="Take this seriously, stay calm" showThemeToggle={false} />

      <motion.div
        className="safety-card warm-card glass-card-inner"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${tokens.warning}`,
          boxShadow: tokens.shadowSoft,
        }}
      >
        <h2 className="safety-title" style={{ color: tokens.text }}>This may need urgent care</h2>
        <p style={{ color: tokens.textSecondary, lineHeight: 1.6, margin: '12px 0 0' }}>
          Healthy.AI can help you prepare a summary, but urgent symptoms should be handled by a
          clinician or emergency service.
        </p>
      </motion.div>

      {!understood ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28, delay: 0.1 }}
        >
          <DoctorSummary variant="full" concern="Reported symptom — escalated for safety review" />
        </motion.div>
      ) : null}

      <motion.div
        className="safety-actions"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.15 }}
      >
        <motion.button
          type="button"
          className="soft-button"
          {...tapScale}
          onClick={openShareSheet}
          style={{ background: tokens.heroGradient, color: '#fff', boxShadow: tokens.shadow, flex: 1 }}
        >
          <FileText size={18} />
          Prepare summary
        </motion.button>
        <motion.button
          type="button"
          className="ghost-button"
          {...tapScale}
          onClick={() => {
            setUnderstood(true);
            resetChat();
          }}
          style={{ flex: 1, color: tokens.textSecondary }}
        >
          I understand
        </motion.button>
      </motion.div>

      <ShareSheet />
    </div>
  );
}

export { SafetyEscalation };
