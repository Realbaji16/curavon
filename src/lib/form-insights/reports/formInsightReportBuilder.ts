import type { FormInsightType } from '../extraction/insightTaxonomy';
import type { FormImportResult } from '../import/formImportService';
import type { MappedFormInsightModules } from '../mapping/moduleInsightMapper';
import type { FormImportPromotionSummary } from '../promotion/autoPromotionEngine';
import type { DeriveOverlaysResult } from '../promotion/productContextOverlayService';
import type { FormInsight, FormSourceRole, NormalizedFormResponse } from '../types';

export type FormInsightReportInput = {
  sourceName: string;
  filename: string;
  sourceRole: FormSourceRole;
  batchId: string;
  importedAt: string;
  rowCount: number;
  normalizedResponses: readonly NormalizedFormResponse[];
  insights: readonly FormInsight[];
  moduleMappings: readonly MappedFormInsightModules[];
  promotionSummary?: FormImportPromotionSummary;
  overlays?: DeriveOverlaysResult;
};

const MAX_PARAPHRASE_LENGTH = 140;

const PRODUCT_CHANGE_TYPES: readonly FormInsightType[] = [
  'feature_request',
  'summary_field_candidate',
  'safe_question_candidate',
  'care_route',
  'module_trigger_candidate',
  'care_blocker',
  'common_concern',
];

const GUARDRAIL_CHANGE_TYPES: readonly FormInsightType[] = [
  'guardrail_candidate',
  'unsafe_medication_pattern',
  'red_flag_candidate',
  'professional_opinion_conflict',
  'distrust_wording',
];

const DO_NOT_PROMOTE_TYPES: readonly FormInsightType[] = [
  ...GUARDRAIL_CHANGE_TYPES,
  'nigerian_phrase',
];

/**
 * Build a Markdown reviewer report from a completed form import.
 * Uses paraphrased insight summaries only — no long raw answer quotes.
 */
export function buildFormInsightReportMarkdown(input: FormInsightReportInput): string {
  const sections = [
    renderTitle(input),
    renderExecutiveSummary(input),
    renderAutoPromotionSummary(input),
    renderSourceMix(input),
    renderLimitations(input),
    renderInsightSection('Common Concern Signals', input.insights, 'common_concern'),
    renderInsightSection('Nigerian Language/Phrase Signals', input.insights, 'nigerian_phrase'),
    renderInsightSection('Care Blockers', input.insights, 'care_blocker'),
    renderInsightSection('Care Routes', input.insights, 'care_route'),
    renderInsightSection('Medication Safety Patterns', input.insights, 'unsafe_medication_pattern'),
    renderInsightSection('Red Flag Candidates', input.insights, 'red_flag_candidate'),
    renderInsightSection('Summary Field Candidates', input.insights, 'summary_field_candidate'),
    renderTrustDistrustSection(input.insights),
    renderInsightSection('Privacy Requirements', input.insights, 'privacy_requirement'),
    renderInsightSection('Feature Requests', input.insights, 'feature_request'),
    renderModuleMappingSection(input.moduleMappings),
    renderDoNotPromoteSection(input.insights),
    renderRecommendedProductChanges(input.insights),
    renderRecommendedGuardrailChanges(input.insights),
    renderNextDataNeeded(input),
  ];

  return sections.filter((section) => section.length > 0).join('\n\n');
}

export function buildFormInsightReportFromImportResult(result: FormImportResult): string {
  return buildFormInsightReportMarkdown({
    sourceName: result.sourceName,
    filename: result.filename,
    sourceRole: result.sourceRole,
    batchId: result.batchId,
    importedAt: result.importedAt,
    rowCount: result.rowCount,
    normalizedResponses: result.normalizedResponses,
    insights: result.insights,
    moduleMappings: result.moduleMappings,
    promotionSummary: result.promotionSummary,
    overlays: result.overlays,
  });
}

function renderTitle(input: FormInsightReportInput): string {
  return [
    '# Form insight report',
    '',
    `**Source:** ${input.sourceName}`,
    `**Filename:** ${input.filename}`,
    `**Primary role:** ${input.sourceRole}`,
    `**Batch ID:** ${input.batchId}`,
    `**Imported at:** ${input.importedAt}`,
  ].join('\n');
}

function renderExecutiveSummary(input: FormInsightReportInput): string {
  const roleMix = summarizeRoleCounts(input.normalizedResponses);
  const topConcerns = topInsightsByType(input.insights, 'common_concern', 3);
  const safetySignals = countInsightsByTypes(input.insights, GUARDRAIL_CHANGE_TYPES);

  const lines = [
    '## Executive Summary',
    '',
    renderMandatoryDisclaimers(),
    '',
    `- **Responses analyzed:** ${input.rowCount}`,
    `- **Insights extracted:** ${input.insights.length}`,
    `- **Module links inferred:** ${countModuleLinks(input.moduleMappings)}`,
    `- **Source mix:** ${roleMix || 'no responses'}`,
    `- **Safety-tagged signals (review backlog):** ${safetySignals}`,
  ];

  if (topConcerns.length > 0) {
    lines.push('', '**Top concern themes (paraphrased):**');
    for (const insight of topConcerns) {
      lines.push(`- ${formatInsightBullet(insight)}`);
    }
  } else {
    lines.push('', '- No common concern themes were extracted in this batch.');
  }

  return lines.join('\n');
}

function renderAutoPromotionSummary(input: FormInsightReportInput): string {
  const summary = input.promotionSummary;
  if (!summary) {
    return '';
  }

  const lines = [
    '## Auto-Promotion Summary',
    '',
    `- **Active overlays:** ${summary.activeOverlayCount}`,
    `- **Shadow overlays:** ${summary.shadowOverlayCount}`,
    `- **Quarantined insights:** ${summary.quarantinedInsightCount}`,
    `- **Blocked insights:** ${summary.blockedInsightCount}`,
  ];

  if (summary.blockedReasons.length > 0) {
    lines.push('', '### Blocked reasons', '');
    for (const entry of summary.blockedReasons.slice(0, 20)) {
      const reasons =
        entry.reasons.length > 0 ? entry.reasons.join(', ') : 'policy_or_validation_blocked';
      lines.push(`- \`${entry.insightId}\` (${entry.insightType}): ${reasons}`);
    }
  } else {
    lines.push('', '- No blocked or quarantined promotion decisions in this batch.');
  }

  if (input.overlays) {
    lines.push(
      '',
      `- **Overlay records derived:** ${input.overlays.overlays.length} (active ${input.overlays.active.length}, shadow ${input.overlays.shadow.length}, blocked ${input.overlays.blocked.length})`,
    );
  }

  return lines.join('\n');
}

function renderSourceMix(input: FormInsightReportInput): string {
  const counts = collectRoleCounts(input.normalizedResponses);
  const lines = ['## Source Mix', ''];

  if (counts.size === 0) {
    lines.push('- No de-identified responses in this batch.');
    return lines.join('\n');
  }

  const total = input.rowCount || [...counts.values()].reduce((sum, count) => sum + count, 0);

  for (const [role, count] of [...counts.entries()].sort((left, right) => right[1] - left[1])) {
    const share = total > 0 ? Math.round((count / total) * 100) : 0;
    lines.push(`- **${role}:** ${count} response(s) (~${share}%)`);
  }

  return lines.join('\n');
}

function renderLimitations(input: FormInsightReportInput): string {
  return [
    '## Limitations',
    '',
    renderMandatoryDisclaimers(),
    '',
    '- Extraction is deterministic keyword/regex matching — not clinical validation and not AI clinical reasoning.',
    '- Raw CSV answers are not stored in this pipeline; only de-identified payloads informed these paraphrases.',
    '- Module mappings are heuristic and require human review before router, copy, or seed changes.',
    '- This report does **not** diagnose conditions, prescribe treatment, or recommend medication changes.',
    `- Current batch size (**n=${input.rowCount}**) is suitable for directional product research only.`,
  ].join('\n');
}

function renderInsightSection(
  title: string,
  insights: readonly FormInsight[],
  type: FormInsightType,
  limit = 10,
): string {
  const matches = insights
    .filter((insight) => insight.insightType === type)
    .sort((left, right) => right.evidence.supportCount - left.evidence.supportCount)
    .slice(0, limit);

  const lines = [`## ${title}`, ''];

  if (matches.length === 0) {
    lines.push('- None detected in this batch.');
    return lines.join('\n');
  }

  for (const insight of matches) {
    lines.push(`- ${formatInsightBullet(insight)}`);
  }

  return lines.join('\n');
}

function renderTrustDistrustSection(insights: readonly FormInsight[]): string {
  const trust = insights.filter((insight) => insight.insightType === 'trust_wording');
  const distrust = insights.filter((insight) => insight.insightType === 'distrust_wording');

  const lines = ['## Trust/Distrust Wording', ''];

  if (trust.length === 0 && distrust.length === 0) {
    lines.push('- None detected in this batch.');
    return lines.join('\n');
  }

  if (trust.length > 0) {
    lines.push('### Trust-supporting phrasing', '');
    for (const insight of sortBySupport(trust).slice(0, 6)) {
      lines.push(`- ${formatInsightBullet(insight)}`);
    }
    lines.push('');
  }

  if (distrust.length > 0) {
    lines.push('### Distrust or over-promising phrasing', '');
    for (const insight of sortBySupport(distrust).slice(0, 6)) {
      lines.push(`- ${formatInsightBullet(insight)}`);
    }
  }

  return lines.join('\n').trimEnd();
}

function renderModuleMappingSection(mappings: readonly MappedFormInsightModules[]): string {
  const counts = new Map<string, number>();
  const influenceCounts = new Map<string, number>();

  for (const mapping of mappings) {
    for (const link of mapping.linkedModules) {
      counts.set(link.moduleId, (counts.get(link.moduleId) ?? 0) + 1);
      for (const influence of link.influenceTypes) {
        influenceCounts.set(influence, (influenceCounts.get(influence) ?? 0) + 1);
      }
    }
  }

  const lines = ['## Module Mapping', ''];

  if (counts.size === 0) {
    lines.push('- No module links inferred.');
    return lines.join('\n');
  }

  lines.push('**By module:**');
  for (const [moduleId, count] of [...counts.entries()].sort((left, right) => right[1] - left[1])) {
    lines.push(`- \`${moduleId}\`: ${count} link(s)`);
  }

  if (influenceCounts.size > 0) {
    lines.push('', '**By influence type:**');
    for (const [influence, count] of [...influenceCounts.entries()].sort(
      (left, right) => right[1] - left[1],
    )) {
      lines.push(`- ${influence}: ${count}`);
    }
  }

  return lines.join('\n');
}

function renderDoNotPromoteSection(insights: readonly FormInsight[]): string {
  const flagged = insights.filter(
    (insight) =>
      DO_NOT_PROMOTE_TYPES.includes(insight.insightType) ||
      insight.approvedFor === 'safety_review_only' ||
      insight.status === 'review',
  );

  const lines = [
    '## Do Not Promote Without Review',
    '',
    'The following signals must not ship to users as medical guidance, module seeds, or composer copy without safety and clinical ops review.',
    '',
  ];

  if (flagged.length === 0) {
    lines.push('- No flagged insights in this batch.');
    return lines.join('\n');
  }

  for (const insight of sortBySupport(flagged).slice(0, 12)) {
    lines.push(
      `- **${insight.insightType}** — ${formatInsightBullet(insight)} (approved scope: ${insight.approvedFor})`,
    );
  }

  return lines.join('\n');
}

function renderRecommendedProductChanges(insights: readonly FormInsight[]): string {
  const candidates = insights.filter((insight) => PRODUCT_CHANGE_TYPES.includes(insight.insightType));
  const lines = [
    '## Recommended Product Changes',
    '',
    'Directional product backlog ideas only — not clinical recommendations.',
    '',
  ];

  if (candidates.length === 0) {
    lines.push('- No product-change candidates in this batch.');
    return lines.join('\n');
  }

  for (const insight of sortBySupport(candidates).slice(0, 10)) {
    lines.push(`- ${productChangeRecommendation(insight)}`);
  }

  return lines.join('\n');
}

function renderRecommendedGuardrailChanges(insights: readonly FormInsight[]): string {
  const candidates = insights.filter((insight) => GUARDRAIL_CHANGE_TYPES.includes(insight.insightType));
  const lines = [
    '## Recommended Guardrail Changes',
    '',
    'Safety review backlog for blocked outputs, escalation language, and medication-risk boundaries.',
    '',
  ];

  if (candidates.length === 0) {
    lines.push('- No guardrail-change candidates in this batch.');
    return lines.join('\n');
  }

  for (const insight of sortBySupport(candidates).slice(0, 10)) {
    lines.push(`- ${guardrailChangeRecommendation(insight)}`);
  }

  return lines.join('\n');
}

function renderNextDataNeeded(input: FormInsightReportInput): string {
  const counts = collectRoleCounts(input.normalizedResponses);
  const missingRoles = (['doctor', 'pharmacy', 'nurse', 'patient', 'caregiver', 'medical_student'] as const).filter(
    (role) => !counts.has(role),
  );

  const lines = ['## Next Data Needed', ''];

  if (input.rowCount < 10) {
    lines.push('- Collect more responses before changing module triggers or professional-summary fields.');
  }

  if (missingRoles.length > 0) {
    lines.push(
      `- Broaden **source mix** — no responses yet from: ${missingRoles.join(', ')}.`,
    );
  }

  if (!hasInsightType(input.insights, 'nigerian_phrase')) {
    lines.push('- Add forms or columns that capture local language/phrasing if pidgin coverage is a goal.');
  }

  if (!hasInsightType(input.insights, 'privacy_requirement')) {
    lines.push('- Capture explicit privacy expectations in future form revisions.');
  }

  if (countInsightsByTypes(input.insights, GUARDRAIL_CHANGE_TYPES) > 0) {
    lines.push('- Schedule safety review for medication and red-flag candidates before any guardrail promotion.');
  }

  if (lines.length === 1) {
    lines.push('- Continue periodic imports to confirm whether early themes persist at higher sample sizes.');
  }

  return lines.join('\n');
}

function renderMandatoryDisclaimers(): string {
  return [
    '> **Product evidence only:** These forms are product research evidence, not clinical evidence.',
    '> **Review required:** All medical and safety-related product changes require human review before release.',
    '> **Low sample size:** Sample size is low; treat patterns as hypotheses until replicated across more responses.',
  ].join('\n');
}

function formatInsightBullet(insight: FormInsight): string {
  const roles =
    insight.evidence.sourceRoles.length > 0
      ? insight.evidence.sourceRoles.join(', ')
      : 'unknown';
  return `${paraphraseSummary(insight.summary)} (support: ${insight.evidence.supportCount}; roles: ${roles}; status: ${insight.status})`;
}

function productChangeRecommendation(insight: FormInsight): string {
  const theme = paraphraseSummary(insight.summary);
  switch (insight.insightType) {
    case 'feature_request':
      return `Backlog feature/theme for product review: ${theme} (support: ${insight.evidence.supportCount}; roles: ${formatRoles(insight)}).`;
    case 'summary_field_candidate':
      return `Evaluate a professional-summary field candidate: ${theme} (support: ${insight.evidence.supportCount}; roles: ${formatRoles(insight)}).`;
    case 'safe_question_candidate':
      return `Review guided-question phrasing candidate: ${theme} (support: ${insight.evidence.supportCount}; roles: ${formatRoles(insight)}).`;
    case 'care_route':
      return `Document care-route context in module copy research: ${theme} (support: ${insight.evidence.supportCount}; roles: ${formatRoles(insight)}).`;
    case 'module_trigger_candidate':
      return `Review module trigger expansion hypothesis: ${theme} (support: ${insight.evidence.supportCount}; roles: ${formatRoles(insight)}).`;
    case 'care_blocker':
      return `Explore friction-reduction UX for access blocker: ${theme} (support: ${insight.evidence.supportCount}; roles: ${formatRoles(insight)}).`;
    default:
      return `Review product-context theme: ${theme} (support: ${insight.evidence.supportCount}; roles: ${formatRoles(insight)}).`;
  }
}

function guardrailChangeRecommendation(insight: FormInsight): string {
  const theme = paraphraseSummary(insight.summary);
  return `Safety review — assess guardrail/blocked-output need for: ${theme} (support: ${insight.evidence.supportCount}; roles: ${formatRoles(insight)}).`;
}

function paraphraseSummary(summary: string): string {
  const normalized = summary.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_PARAPHRASE_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_PARAPHRASE_LENGTH - 1)}…`;
}

function formatRoles(insight: FormInsight): string {
  return insight.evidence.sourceRoles.length > 0
    ? insight.evidence.sourceRoles.join(', ')
    : 'unknown';
}

function collectRoleCounts(responses: readonly NormalizedFormResponse[]): Map<FormSourceRole, number> {
  const counts = new Map<FormSourceRole, number>();
  for (const response of responses) {
    counts.set(response.sourceRole, (counts.get(response.sourceRole) ?? 0) + 1);
  }
  return counts;
}

function summarizeRoleCounts(responses: readonly NormalizedFormResponse[]): string {
  const counts = collectRoleCounts(responses);
  if (counts.size === 0) return '';
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([role, count]) => `${role} (${count})`)
    .join(', ');
}

function topInsightsByType(
  insights: readonly FormInsight[],
  type: FormInsightType,
  limit: number,
): FormInsight[] {
  return insights
    .filter((insight) => insight.insightType === type)
    .sort((left, right) => right.evidence.supportCount - left.evidence.supportCount)
    .slice(0, limit);
}

function sortBySupport(insights: readonly FormInsight[]): FormInsight[] {
  return [...insights].sort((left, right) => right.evidence.supportCount - left.evidence.supportCount);
}

function countInsightsByTypes(
  insights: readonly FormInsight[],
  types: readonly FormInsightType[],
): number {
  const typeSet = new Set(types);
  return insights.filter((insight) => typeSet.has(insight.insightType)).length;
}

function hasInsightType(insights: readonly FormInsight[], type: FormInsightType): boolean {
  return insights.some((insight) => insight.insightType === type);
}

function countModuleLinks(mappings: readonly MappedFormInsightModules[]): number {
  return mappings.reduce((total, mapping) => total + mapping.linkedModules.length, 0);
}
