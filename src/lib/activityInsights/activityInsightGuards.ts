import type { ActivityInsight, ActivityInsightTone, ActivityInsightType } from '../../types/activityInsights';

const ALLOWED_TYPES = new Set<ActivityInsightType>([
  'action_pattern',
  'follow_up_pattern',
  'guide_pattern',
  'check_in_pattern',
  'safety_note',
  'data_quality',
  'preference',
]);

const ALLOWED_TONES = new Set<ActivityInsightTone>(['neutral', 'encouraging', 'caution']);

const BLOCKED_PATTERNS = [
  /\byou have\b/i,
  /\byou may have\b/i,
  /\bdisorder\b/i,
  /\bdisease\b/i,
  /\btreatment plan\b/i,
  /\btake medication\b/i,
  /\bstop medication\b/i,
  /\bstart medication\b/i,
  /\b\d+\s*mg\b/i,
  /\bno need to see a doctor\b/i,
  /\bharmless\b/i,
  /\byou are safe\b/i,
  /\bemergency monitoring\b/i,
  /\bclinical monitoring\b/i,
  /raw prompt/i,
  /model response/i,
];

const ALLOWED_DIAGNOSIS_DISCLAIMERS = [
  /not a diagnosis/i,
  /does not diagnose/i,
  /this is not diagnosis/i,
  /not diagnose/i,
];

function containsBlockedLanguage(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ');
  const hasDiagnosisDisclaimer = ALLOWED_DIAGNOSIS_DISCLAIMERS.some((pattern) => pattern.test(normalized));
  const diagnosisBlocked =
    /\bdiagnos/i.test(normalized) &&
    !hasDiagnosisDisclaimer &&
    !/\bnot\b.+\bdiagnos/i.test(normalized);

  if (diagnosisBlocked) return true;
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isActivityInsightSafe(insight: ActivityInsight): boolean {
  if (!ALLOWED_TYPES.has(insight.type)) return false;
  if (!ALLOWED_TONES.has(insight.tone)) return false;
  if (!['not_medical', 'safety_related'].includes(insight.safetyLabel)) return false;
  if (!insight.title.trim() || !insight.body.trim()) return false;
  if (insight.title.length > 120 || insight.body.length > 400) return false;
  if (insight.evidence.some((line) => line.length > 160)) return false;
  if (insight.evidence.length > 5) return false;

  const combined = [insight.title, insight.body, ...insight.evidence].join(' ');
  if (containsBlockedLanguage(combined)) return false;

  if (insight.suggestedPreference) {
    const pref = `${insight.suggestedPreference.label} ${insight.suggestedPreference.value}`;
    if (containsBlockedLanguage(pref)) return false;
    if (/medication|dose|prescri/i.test(pref)) return false;
  }

  return true;
}

export function filterSafeActivityInsights(insights: ActivityInsight[]): ActivityInsight[] {
  return insights.filter(isActivityInsightSafe);
}

export function sanitizeActivityInsightCandidate(
  candidate: Partial<ActivityInsight>,
  source: ActivityInsight['source'],
): ActivityInsight | null {
  if (!candidate.title || !candidate.body || !candidate.type) return null;

  const insight: ActivityInsight = {
    id: candidate.id ?? `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: candidate.type,
    title: candidate.title.trim(),
    body: candidate.body.trim(),
    tone: candidate.tone ?? 'neutral',
    evidence: (candidate.evidence ?? []).map((line) => line.trim()).filter(Boolean).slice(0, 4),
    suggestedPreference: candidate.suggestedPreference,
    createdAt: candidate.createdAt ?? new Date().toISOString(),
    source,
    safetyLabel: candidate.safetyLabel ?? (candidate.type === 'safety_note' ? 'safety_related' : 'not_medical'),
  };

  return isActivityInsightSafe(insight) ? insight : null;
}
