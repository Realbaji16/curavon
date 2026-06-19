import type { AIBlockReason } from './aiPolicyTypes';

export interface AIDecisionTrace {
  id: string;
  timestamp: string;
  source: 'ask' | 'today' | 'guides' | 'doctor_summary' | 'followup' | 'memory';
  task: string;
  requestedStage: string;
  allowed: boolean;
  blockReason?: AIBlockReason;
  moduleSelected: string;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  cacheHit: boolean;
  fallbackUsed: boolean;
  aiUsed: boolean;
  estimatedTokens: number;
  contextType: 'compressed' | 'none';
  reason: string;
  aiSynthesized?: boolean;
  boundaryValidated?: boolean;
}

export interface AIObservabilitySummary {
  totalRequests: number;
  aiUsedCount: number;
  aiBlockedCount: number;
  fallbackCount: number;
  safetyOverrideCount: number;
  cacheHitCount: number;
  estimatedTokensUsed: number;
  mostCommonBlockReasons: Array<{ reason: string; count: number }>;
  taskBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  lastUpdated: string;
}
