import type { ActivityInsight, ActivityInsightInputSummary } from '../../types/activityInsights';

function makeInsight(
  partial: Omit<ActivityInsight, 'id' | 'createdAt' | 'source' | 'safetyLabel'>,
): ActivityInsight {
  return {
    ...partial,
    id: `ai-rule-${partial.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    source: 'rules',
    safetyLabel: partial.type === 'safety_note' ? 'safety_related' : 'not_medical',
  };
}

export function generateRuleActivityInsights(
  summary: ActivityInsightInputSummary,
): ActivityInsight[] {
  const insights: ActivityInsight[] = [];

  if (summary.actionOutcomes.blocked >= 2) {
    insights.push(
      makeInsight({
        type: 'action_pattern',
        title: 'Smaller steps may work better',
        body: 'You’ve marked a few actions as blocked. Curavon can make future next steps lighter and easier to start.',
        tone: 'encouraging',
        evidence: [`${summary.actionOutcomes.blocked} actions were marked blocked ${summary.dateRange.toLowerCase()}.`],
        suggestedPreference: {
          label: 'Prefer smaller next steps',
          value: 'prefer_smaller_steps',
        },
      }),
    );
  }

  if (summary.flowStats.abandoned >= 1) {
    insights.push(
      makeInsight({
        type: 'guide_pattern',
        title: 'A shorter guide may help',
        body: 'One guide was stopped before the end. Curavon can offer a shorter version next time.',
        tone: 'neutral',
        evidence: summary.guidePatterns.length
          ? summary.guidePatterns
          : [`${summary.flowStats.abandoned} guide stop${summary.flowStats.abandoned === 1 ? '' : 's'} before completion.`],
      }),
    );
  }

  if (summary.checkInStats.count >= 3) {
    insights.push(
      makeInsight({
        type: 'check_in_pattern',
        title: 'You’re building useful context',
        body: 'Your recent check-ins give Curavon more context for safer next actions.',
        tone: 'encouraging',
        evidence: [`Check-ins were completed on ${summary.checkInStats.count} days ${summary.dateRange.toLowerCase()}.`],
      }),
    );
  }

  if (summary.safetyStats.redFlagCount >= 1) {
    const sourceHint =
      summary.safetyStats.sources.length > 0
        ? ` from ${summary.safetyStats.sources[0]}`
        : '';
    insights.push(
      makeInsight({
        type: 'safety_note',
        title: 'A safety note was saved',
        body: 'Curavon saved a short safety note so you can review it later or prepare for a clinician conversation. This is not a diagnosis.',
        tone: 'caution',
        evidence: [`${summary.safetyStats.redFlagCount} safety note${summary.safetyStats.redFlagCount === 1 ? '' : 's'} saved${sourceHint}.`],
      }),
    );
  }

  if (
    summary.checkInStats.count < 2 &&
    summary.actionOutcomes.completed + summary.actionOutcomes.blocked === 0 &&
    summary.flowStats.started === 0
  ) {
    insights.push(
      makeInsight({
        type: 'data_quality',
        title: 'Curavon needs a little more context',
        body: 'A few short check-ins can help Curavon suggest safer, more useful next steps.',
        tone: 'neutral',
        evidence: ['Limited recent activity in the last two weeks.'],
      }),
    );
  }

  if (summary.actionOutcomes.completed >= 2 && insights.length < 4) {
    insights.push(
      makeInsight({
        type: 'action_pattern',
        title: 'Helpful steps are adding up',
        body: 'You completed more than one next step recently. Curavon can keep future actions at a similar, manageable size.',
        tone: 'encouraging',
        evidence: [`${summary.actionOutcomes.completed} actions marked done ${summary.dateRange.toLowerCase()}.`],
      }),
    );
  }

  return insights.slice(0, 4);
}
