export type {
  HealthIntelligenceInput,
  HealthIntelligenceResult,
  HealthModuleRegistry,
  IntelligenceQuestion,
  IntelligenceRedFlagHit,
  IntelligenceRiskLevel,
  IntelligenceSafety,
  IntelligenceSummaryPreview,
  SelectedModuleMatch,
} from './types';

export type {
  AIGeneratedQuestionPolicy,
  HealthModule,
  HealthModuleRiskLevel,
  HealthModuleStatus,
  ModuleActionCategory,
  ModuleAllowedAction,
  ModuleEntryTrigger,
  ModuleQuestion,
  ModuleQuestionKind,
  ModuleRedFlag,
  ModuleRedFlagSeverity,
  ModuleSummaryField,
  ModuleSummaryFieldKind,
} from './modules/moduleTypes';

export {
  HEALTH_MODULE_IDS,
  isHealthModuleId,
  type HealthModuleId,
} from './modules/moduleIds';

export {
  HEALTH_MODULES,
  HEALTH_MODULE_BY_ID,
  getHealthModuleById,
  listHealthModules,
} from './modules/moduleCatalog';

export { normalizeNigerianHealthLanguage } from './services/languageNormalizer';
export type { NigerianHealthLanguageNormalization } from './services/languageNormalizer';

export { routeHealthModules } from './services/moduleRouter';
export type {
  HealthModuleRoutingResult,
  RoutedModuleSelection,
  RouteHealthModulesInput,
  RouterRiskLevel,
} from './services/moduleRouter';

export { generateGuidedQuestions } from './services/guidedQuestionEngine';
export type {
  GenerateGuidedQuestionsInput,
  GuidedQuestion,
  GuidedQuestionType,
} from './services/guidedQuestionEngine';

export { NIGERIAN_HEALTH_PHRASES } from './nigeria/healthPhrases';
export type { HealthPhraseDefinition, PhraseMatch } from './nigeria/healthPhrases';

export {
  CARE_ROUTE_HINTS,
  CARE_ROUTES_BY_TAG,
  careRoutesForTags,
} from './nigeria/careRoutes';
export type { CareRouteHint, NigeriaCareRoute } from './nigeria/careRoutes';

export { maskBlockedPhraseRegions } from './nigeria/blockers';

export {
  APPROVED_ACTION_IDS,
  APPROVED_ACTIONS,
  getApprovedAction,
  isApprovedActionId,
} from './actions/allowedActions';
export type { ApprovedAction, ApprovedActionCategory, ApprovedActionId } from './actions/allowedActions';

export {
  HEALTH_INTELLIGENCE_BLOCKED_PATTERNS,
  SAFE_RESPONSE_PHRASES,
  findHealthIntelligenceBlockedViolations,
  isHealthIntelligenceOutputBlocked,
  containsSafeResponseLanguage,
} from './actions/blockedOutputs';
export type {
  BlockedOutputCategory,
  BlockedOutputPattern,
  BlockedOutputViolation,
} from './actions/blockedOutputs';

export { resolveNextBestAction, selectNextBestAction } from './services/nextBestActionPolicy';
export type { NextBestActionInput, NextBestActionResult } from './services/nextBestActionPolicy';

export {
  assertHealthIntelligenceResponseSafe,
  isHealthIntelligenceResponseAllowed,
  validateHealthIntelligenceResponse,
} from './services/responseSafetyValidator';
export type {
  ResponseSafetyValidationResult,
  ValidateHealthIntelligenceResponseOptions,
} from './services/responseSafetyValidator';

export {
  buildProfessionalSummaryPreview,
  resolveProfessionalSummaryType,
} from './services/professionalSummaryBuilder';
export type {
  BuildProfessionalSummaryInput,
  ProfessionalSummaryField,
  ProfessionalSummaryPreview,
  ProfessionalSummaryType,
} from './services/professionalSummaryBuilder';

export { bridgeRedFlags, detectRedFlags } from './services/redFlagBridge';
export type { RedFlagBridgeResult, RedFlagDetectionResult, RedFlagMatch } from './services/redFlagBridge';

export { runHealthIntelligencePipeline } from './services/healthIntelligencePipeline';
export type { HealthIntelligencePipelineInput } from './services/healthIntelligencePipeline';
