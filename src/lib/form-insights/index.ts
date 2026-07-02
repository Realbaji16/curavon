/**
 * Uploaded Forms Insight Layer (Phase 3)
 *
 * De-identified form exports → product/safety research insights.
 * **Not clinical truth.** Never used as medical advice to end users.
 */

export type {
  CreateFormInsightInput,
  FormInsight,
  FormInsightApprovedFor,
  FormInsightConfidence,
  FormInsightEvidence,
  FormInsightLinkedModule,
  FormInsightMedicalTruth,
  FormInsightProductUse,
  FormInsightStatus,
  FormSourceRole,
  NormalizedFormResponse,
} from './types';

export {
  createDraftFormInsight,
  DEFAULT_FORM_INSIGHT_APPROVED_FOR,
  DEFAULT_FORM_INSIGHT_MEDICAL_TRUTH,
  FORM_SOURCE_ROLES,
  isAllowedFormInsightApproval,
  isFormSourceRole,
} from './types';

export {
  defaultApprovedForInsightType,
  FORM_INSIGHT_TAXONOMY,
  FORM_INSIGHT_TYPES,
  getFormInsightTaxonomyEntry,
  isFormInsightType,
} from './extraction/insightTaxonomy';

export type { FormInsightTaxonomyEntry, FormInsightType } from './extraction/insightTaxonomy';

export { extractFormInsights } from './extraction/insightExtractor';
export type { ExtractFormInsightsInput, ExtractFormInsightsResult } from './extraction/insightExtractor';

export {
  getModuleInfluenceTaxonomyEntry,
  isModuleInfluenceType,
  MODULE_INFLUENCE_TAXONOMY,
  MODULE_INFLUENCE_TYPES,
} from './mapping/moduleInfluenceTypes';

export type {
  ModuleInfluenceLink,
  ModuleInfluenceTaxonomyEntry,
  ModuleInfluenceType,
} from './mapping/moduleInfluenceTypes';

export {
  applyModuleMappingsToInsights,
  mapInsightToModules,
  mapInsightsToModules,
  MODULE_KEYWORD_RULES,
  resolveInfluenceTypesForInsight,
  resolveModulesFromInsightText,
} from './mapping/moduleInsightMapper';
export type { MappedFormInsightModules, ModuleKeywordRule } from './mapping/moduleInsightMapper';

export { parseCsvRecords, parseGoogleFormCsv } from './import/csvFormParser';
export type { FormCsvParseResult, ParseGoogleFormCsvOptions } from './import/formSourceTypes';

export {
  detectSourceRoleFromFilename,
  hashRawRowPayload,
  redactFormRow,
  redactFormRows,
  toNormalizedFormResponse,
} from './import/formRedactor';
export type { RedactFormRowInput, RedactFormRowResult } from './import/formSourceTypes';

export {
  buildFormInsightReportFromImportResult,
  buildFormInsightReportMarkdown,
} from './reports/formInsightReportBuilder';
export type { FormInsightReportInput } from './reports/formInsightReportBuilder';

export { runFormImport, toFormImportArtifact } from './import/formImportService';
export type {
  FormImportArtifact,
  FormImportInput,
  FormImportResult,
} from './import/formImportService';

export {
  buildFormImportPublicSummary,
  executeFormImportFromCsv,
  isFormImportPersistenceConfigured,
} from './import/formImportExecution';
export type {
  ExecuteFormImportOptions,
  FormImportPublicInsightSummary,
  FormImportPublicSummary,
} from './import/formImportExecution';

export { FORM_IMPORT_MAX_BYTES, validateFormImportUpload } from './import/formImportUpload';
export type {
  FormImportUploadValidationErrorCode,
  FormImportUploadValidationResult,
} from './import/formImportUpload';

export {
  buildFormInsightProductContext,
  enrichNigerianHealthLanguageNormalization,
  EMPTY_FORM_INSIGHT_PRODUCT_CONTEXT,
  getFormInsightModuleHintsForText,
} from './formInsightContextService';
export type {
  FormInsightBlockerOption,
  FormInsightCareRouteCopyLine,
  FormInsightFeatureHint,
  FormInsightProductContext,
  FormInsightResponseCopyLine,
  FormInsightRoutingTrigger,
  FormInsightSafeQuestionCandidate,
  FormInsightSummaryFieldCandidate,
} from './formInsightContextService';

export {
  AUTO_APPLICABLE_INFLUENCE_TYPES,
  canAutoApplyInfluenceType,
  canInsightInfluenceLiveBehavior,
  filterAutoApplicableInfluenceTypes,
  isReviewOnlyInsightType,
  REVIEW_ONLY_INSIGHT_TYPES,
} from './review/insightApprovalRules';

export {
  assertNoClinicalAdviceInProductContext,
  assessFormInsightProductText,
  isSafeFormInsightProductText,
  sanitizeFormInsightProductText,
} from './review/insightReviewPolicy';

export {
  applyAutoPromotionAuditStatus,
  buildFormImportPromotionSummary,
  buildInsightPromotionRecord,
  evaluateBatchPromotion,
  evaluateInsightPromotion,
  getLiveEligibleInsights,
  isInsightLiveEligible,
  runImportAutoPromotion,
} from './promotion/autoPromotionEngine';
export type {
  BatchPromotionResult,
  FormImportPromotionSummary,
  ImportAutoPromotionResult,
  InsightPromotionDbStatus,
  InsightPromotionDecision,
  InsightPromotionOutcome,
  InsightPromotionRecord,
} from './promotion/autoPromotionEngine';

export {
  assertPromotionPolicyCoverage,
  AUTO_PROMOTE_INSIGHT_TYPES,
  isAutoPromoteInsightType,
  isQuarantineInsightType,
  isShadowThenPromoteInsightType,
  QUARANTINE_ALWAYS_INSIGHT_TYPES,
  resolveAutoPromotionPolicy,
  resolveInsightPromotionClass,
  SHADOW_PROMOTE_MIN_SUPPORT,
  SHADOW_THEN_PROMOTE_INSIGHT_TYPES,
} from './promotion/autoPromotionPolicy';
export type {
  AutoPromoteInsightType,
  AutoPromotionPolicyType,
  InsightPromotionClass,
  QuarantineInsightType,
  ShadowThenPromoteInsightType,
} from './promotion/autoPromotionPolicy';

export {
  buildFormInsightOverlay,
  buildProductContextFromInsights,
  summarizePromotionDecisions,
} from './promotion/overlayBuilder';
export type { BuildFormInsightOverlayOptions, FormInsightOverlay } from './promotion/overlayBuilder';

export {
  validateInsightForLivePromotion,
  validateInsightTextForLivePromotion,
} from './promotion/promotionValidators';
export type { PromotionValidationResult } from './promotion/promotionValidators';

export {
  PRODUCT_CONTEXT_OVERLAY_LIFECYCLES,
  PRODUCT_CONTEXT_OVERLAY_TYPES,
  collectOverlayPayloadText,
  isActiveOverlayLifecycle,
  isIgnoredOverlayLifecycle,
  isJsonSerializable,
  isProductContextOverlayLifecycle,
  isProductContextOverlayType,
  validateOverlayPayload,
} from './promotion/productContextOverlayTypes';
export type {
  BlockerOptionOverlayPayload,
  CareRouteOverlayPayload,
  FeatureBacklogItemOverlayPayload,
  JsonPrimitive,
  JsonValue,
  LifestyleContextOverlayPayload,
  ModuleTriggerOverlayPayload,
  OverlayPayloadValidationResult,
  ProductContextOverlay,
  ProductContextOverlayLifecycle,
  ProductContextOverlayPayload,
  ProductContextOverlayPayloadByType,
  ProductContextOverlayType,
  ResponseCopyOverlayPayload,
  SafeQuestionOverlayPayload,
  SummaryFieldOverlayPayload,
} from './promotion/productContextOverlayTypes';

export {
  activateOverlay,
  buildProductContextFromActiveOverlays,
  deriveOverlaysFromInsight,
  deriveOverlaysFromInsights,
  getActiveOverlays,
  partitionOverlays,
  resolveOverlayLifecycle,
  resolveOverlayTypeForInfluence,
  retireOverlay,
  shadowOverlay,
} from './promotion/productContextOverlayService';
export type {
  BuildProductContextFromOverlaysOptions,
  DeriveOverlaysResult,
} from './promotion/productContextOverlayService';

export {
  CLASS_B_INSIGHT_TYPES,
  applyShadowPromotionOutcome,
  isClassBInsightType,
  isShadowPromotionCandidate,
  runShadowPromotionBatch,
  runShadowPromotionOnInsight,
  validateCommonConcern,
  validateModuleTriggerCandidate,
  validateModuleTriggerOverlay,
  validateSafeQuestionCandidate,
  validateSafeQuestionOverlay,
  validateShadowPromotionInsight,
} from './promotion/shadowPromotionRunner';
export type {
  ShadowPromotionBatchResult,
  ShadowPromotionEventType,
  ShadowPromotionInsightResult,
  ShadowPromotionOutcome,
} from './promotion/shadowPromotionRunner';
export {
  meetsClassBShadowSupportThreshold,
  requiresShadowPromotionRunner,
} from './promotion/classBInsightTypes';
export type { ClassBInsightType, ShadowPromotionRuntimeStatus } from './promotion/classBInsightTypes';

export {
  matchesRollbackFilter,
  normalizeLocalOverlayStore,
  parseOverlayRollbackArgs,
  rollbackLocalOverlayStore,
  rollbackOverlays,
  rollbackOverlaysInSupabase,
  selectOverlaysForRollback,
  serializeLocalOverlayStore,
  summarizeRollbackForCli,
} from './promotion/overlayRollbackService';
export type {
  LocalOverlayStore,
  OverlayRollbackEvent,
  OverlayRollbackFilter,
  OverlayRollbackResult,
} from './promotion/overlayRollbackService';

export {
  createProductContextOverlayRepository,
  listOverlays,
  retireOverlayByKey,
  upsertOverlays,
} from './promotion/productContextOverlayRepository';
export type {
  ListProductContextOverlaysFilter,
  ProductContextOverlayRepository,
  ProductContextOverlayRepositoryError,
  ProductContextOverlayRepositoryErrorCode,
  UpsertOverlaysFromInsightsInput,
  UpsertOverlaysFromInsightsResult,
} from './promotion/productContextOverlayRepository';

export {
  DEFAULT_LOCAL_OVERLAY_FILE,
  loadActiveOverlays,
  loadActiveOverlaysFromLocalFile,
  loadActiveOverlaysFromSupabase,
  logOverlayWarning,
  validateRuntimeOverlay,
} from './runtime/activeOverlayLoader';
export type {
  ActiveOverlayLoadWarning,
  LoadActiveOverlaysOptions,
  LoadActiveOverlaysResult,
} from './runtime/activeOverlayLoader';

export {
  DEFAULT_PRODUCT_CONTEXT_CACHE_TTL_MS,
  getActiveProductContext,
  getCachedActiveProductContext,
  resetActiveProductContextCache,
  resolveFormInsightContext,
  seedActiveProductContextForTests,
  warmActiveProductContextCache,
} from './runtime/productContextProvider';
export type { GetActiveProductContextOptions } from './runtime/productContextProvider';
