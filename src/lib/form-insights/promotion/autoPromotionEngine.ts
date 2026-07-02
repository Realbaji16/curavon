import type { FormInsight, FormInsightStatus } from '../types';
import {
  resolveAutoPromotionPolicy,
  resolveInsightPromotionClass,
  SHADOW_PROMOTE_MIN_SUPPORT,
  type AutoPromotionPolicyType,
  type InsightPromotionClass,
} from './autoPromotionPolicy';
import { deriveOverlaysFromInsights, type DeriveOverlaysResult } from './productContextOverlayService';
import { requiresShadowPromotionRunner } from './classBInsightTypes';
import { validateInsightForLivePromotion } from './promotionValidators';

export const PROMOTION_ENGINE_VERSION = 'phase3_v1';

export type InsightPromotionOutcome = 'live' | 'shadow' | 'quarantined' | 'blocked';

export type InsightPromotionDecision = {
  insightId: string;
  insightType: FormInsight['insightType'];
  policy: AutoPromotionPolicyType;
  outcome: InsightPromotionOutcome;
  /** May shape live product behavior now. */
  liveEligible: boolean;
  /** Stored for reporting; waiting on support threshold or review. */
  shadowOnly: boolean;
  /** Medical/safety-risk — never live-applied automatically. */
  quarantined: boolean;
  /** Suggested audit status for persistence and back-office. */
  auditStatus: FormInsightStatus;
  validationReasons: readonly string[];
};

export type BatchPromotionResult = {
  decisions: InsightPromotionDecision[];
  liveEligible: FormInsight[];
  shadowed: FormInsight[];
  quarantined: FormInsight[];
  blocked: FormInsight[];
};

export function evaluateInsightPromotion(insight: FormInsight): InsightPromotionDecision {
  const policy = resolveAutoPromotionPolicy(insight.insightType);
  const validation = validateInsightForLivePromotion(insight);

  if (policy === 'quarantine_always') {
    return {
      insightId: insight.insightId,
      insightType: insight.insightType,
      policy,
      outcome: 'quarantined',
      liveEligible: false,
      shadowOnly: false,
      quarantined: true,
      auditStatus: 'review',
      validationReasons: ['quarantine_policy'],
    };
  }

  if (!validation.valid) {
    return {
      insightId: insight.insightId,
      insightType: insight.insightType,
      policy,
      outcome: 'blocked',
      liveEligible: false,
      shadowOnly: policy === 'shadow_then_promote',
      quarantined: false,
      auditStatus: insight.status === 'rejected' ? 'rejected' : 'review',
      validationReasons: validation.reasons,
    };
  }

  if (policy === 'auto_promote_product_context') {
    return {
      insightId: insight.insightId,
      insightType: insight.insightType,
      policy,
      outcome: 'live',
      liveEligible: true,
      shadowOnly: false,
      quarantined: false,
      auditStatus: 'approved',
      validationReasons: [],
    };
  }

  const meetsShadowThreshold = insight.evidence.supportCount >= SHADOW_PROMOTE_MIN_SUPPORT;

  if (policy === 'shadow_then_promote' && requiresShadowPromotionRunner(insight.insightType)) {
    if (insight.shadowPromotion === 'activated' && meetsShadowThreshold) {
      return {
        insightId: insight.insightId,
        insightType: insight.insightType,
        policy,
        outcome: 'live',
        liveEligible: true,
        shadowOnly: false,
        quarantined: false,
        auditStatus: 'approved',
        validationReasons: [],
      };
    }

    if (insight.shadowPromotion === 'blocked') {
      return {
        insightId: insight.insightId,
        insightType: insight.insightType,
        policy,
        outcome: 'blocked',
        liveEligible: false,
        shadowOnly: false,
        quarantined: false,
        auditStatus: 'review',
        validationReasons: ['shadow_promotion_test_failed'],
      };
    }

    if (meetsShadowThreshold) {
      return {
        insightId: insight.insightId,
        insightType: insight.insightType,
        policy,
        outcome: 'shadow',
        liveEligible: false,
        shadowOnly: true,
        quarantined: false,
        auditStatus: 'review',
        validationReasons: ['shadow_pending_promotion_tests'],
      };
    }
  }

  if (meetsShadowThreshold) {
    return {
      insightId: insight.insightId,
      insightType: insight.insightType,
      policy,
      outcome: 'live',
      liveEligible: true,
      shadowOnly: false,
      quarantined: false,
      auditStatus: 'approved',
      validationReasons: [],
    };
  }

  return {
    insightId: insight.insightId,
    insightType: insight.insightType,
    policy,
    outcome: 'shadow',
    liveEligible: false,
    shadowOnly: true,
    quarantined: false,
    auditStatus: 'review',
    validationReasons: [`shadow_support_below_${SHADOW_PROMOTE_MIN_SUPPORT}`],
  };
}

export function evaluateBatchPromotion(insights: readonly FormInsight[]): BatchPromotionResult {
  const decisions = insights.map((insight) => evaluateInsightPromotion(insight));
  const liveEligible: FormInsight[] = [];
  const shadowed: FormInsight[] = [];
  const quarantined: FormInsight[] = [];
  const blocked: FormInsight[] = [];

  for (let index = 0; index < insights.length; index += 1) {
    const insight = insights[index]!;
    const decision = decisions[index]!;

    if (decision.liveEligible) {
      liveEligible.push(insight);
      continue;
    }
    if (decision.quarantined) {
      quarantined.push(insight);
      continue;
    }
    if (decision.outcome === 'blocked') {
      blocked.push(insight);
      continue;
    }
    if (decision.shadowOnly) {
      shadowed.push(insight);
    }
  }

  return { decisions, liveEligible, shadowed, quarantined, blocked };
}

/** Apply policy-based audit statuses without changing insight content. */
export function applyAutoPromotionAuditStatus(insights: readonly FormInsight[]): FormInsight[] {
  return insights.map((insight) => {
    const decision = evaluateInsightPromotion(insight);
    if (insight.status === decision.auditStatus) {
      return insight;
    }
    return { ...insight, status: decision.auditStatus };
  });
}

export function getLiveEligibleInsights(insights: readonly FormInsight[]): FormInsight[] {
  return evaluateBatchPromotion(insights).liveEligible;
}

export function isInsightLiveEligible(insight: FormInsight): boolean {
  return evaluateInsightPromotion(insight).liveEligible;
}

export type InsightPromotionDbStatus =
  | 'pending'
  | 'active'
  | 'shadow'
  | 'blocked'
  | 'quarantined'
  | 'retired';

export type InsightPromotionRecord = {
  riskClass: InsightPromotionClass;
  autoEligible: boolean;
  autoPromotionStatus: InsightPromotionDbStatus;
  promotionScore: number;
  promotionReason: string | null;
  blockedReason: string | null;
  appliedAt: string | null;
  retiredAt: string | null;
  promotionVersion: string;
};

export type FormImportPromotionSummary = {
  activeOverlayCount: number;
  shadowOverlayCount: number;
  quarantinedInsightCount: number;
  blockedInsightCount: number;
  blockedReasons: Array<{
    insightId: string;
    insightType: FormInsight['insightType'];
    reasons: readonly string[];
  }>;
};

export type ImportAutoPromotionResult = {
  insights: FormInsight[];
  promotion: BatchPromotionResult;
  overlays: DeriveOverlaysResult;
  promotionSummary: FormImportPromotionSummary;
};

export function mapPromotionOutcomeToDbStatus(
  decision: InsightPromotionDecision,
): InsightPromotionDbStatus {
  if (decision.quarantined) return 'quarantined';
  if (decision.outcome === 'live') return 'active';
  if (decision.outcome === 'shadow') return 'shadow';
  if (decision.outcome === 'blocked') return 'blocked';
  return 'pending';
}

export function computePromotionScore(
  insight: FormInsight,
  decision: InsightPromotionDecision,
): number {
  if (decision.quarantined || decision.outcome === 'blocked') return 0;
  if (decision.liveEligible) return 1;
  if (decision.shadowOnly) {
    return Math.min(1, insight.evidence.supportCount / SHADOW_PROMOTE_MIN_SUPPORT);
  }
  return 0;
}

export function buildInsightPromotionRecord(
  insight: FormInsight,
  decision: InsightPromotionDecision,
): InsightPromotionRecord {
  const riskClass = resolveInsightPromotionClass(insight.insightType);
  const autoPromotionStatus = mapPromotionOutcomeToDbStatus(decision);
  const promotionScore = computePromotionScore(insight, decision);
  const now = new Date().toISOString();

  const promotionReason =
    decision.liveEligible
      ? `auto_promoted:${decision.policy}`
      : decision.shadowOnly
        ? decision.validationReasons[0] ?? 'shadow_then_promote'
        : null;

  const blockedReason =
    decision.quarantined || decision.outcome === 'blocked'
      ? decision.validationReasons.join('; ') || decision.outcome
      : null;

  return {
    riskClass,
    autoEligible: decision.liveEligible,
    autoPromotionStatus,
    promotionScore,
    promotionReason,
    blockedReason,
    appliedAt: decision.liveEligible ? now : null,
    retiredAt: null,
    promotionVersion: PROMOTION_ENGINE_VERSION,
  };
}

export function buildFormImportPromotionSummary(
  promotion: BatchPromotionResult,
  overlays: DeriveOverlaysResult,
): FormImportPromotionSummary {
  const blockedReasons = promotion.decisions
    .filter((decision) => decision.outcome === 'blocked' || decision.quarantined)
    .map((decision) => ({
      insightId: decision.insightId,
      insightType: decision.insightType,
      reasons: decision.validationReasons,
    }));

  return {
    activeOverlayCount: overlays.active.length,
    shadowOverlayCount: overlays.shadow.length,
    quarantinedInsightCount: promotion.quarantined.length,
    blockedInsightCount: promotion.blocked.length,
    blockedReasons,
  };
}

/**
 * Evaluate auto-promotion policy, derive overlays, and apply audit statuses.
 * Runs immediately after module mapping in the import pipeline.
 */
export function runImportAutoPromotion(mappedInsights: readonly FormInsight[]): ImportAutoPromotionResult {
  const promotion = evaluateBatchPromotion(mappedInsights);
  const insights = applyAutoPromotionAuditStatus(mappedInsights);
  const overlays = deriveOverlaysFromInsights(insights);
  const promotionSummary = buildFormImportPromotionSummary(promotion, overlays);

  return {
    insights,
    promotion,
    overlays,
    promotionSummary,
  };
}
