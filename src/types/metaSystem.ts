export type MetaActionStatus = 'done' | 'blocked' | 'adjusted' | 'ignored';

export interface MetaActionOutcome {
  id: string;
  actionId: string;
  status: MetaActionStatus;
  category?: string;
  source?: string;
  reasonCode?: string;
  createdAt: string;
}

export type MetaSafetyEventType = 'red_flag_trigger' | 'near_miss' | 'escalation';

export interface MetaSafetyEvent {
  id: string;
  eventType: MetaSafetyEventType;
  source: string;
  severity: 'low' | 'medium' | 'high';
  signal: string;
  createdAt: string;
}

export type MetaFlowEvent = 'start' | 'step' | 'back' | 'complete' | 'abandon' | 'skip';

export interface MetaFlowBehaviorEvent {
  id: string;
  flowId: string;
  event: MetaFlowEvent;
  stepIndex?: number;
  totalSteps?: number;
  createdAt: string;
}

export interface MetaPatternInsight {
  id: string;
  type:
    | 'repeated_blockers'
    | 'repeated_symptoms'
    | 'recurring_stress'
    | 'repeated_ask_usage'
    | 'repeated_flow_abandonment';
  description: string;
  evidence: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface MetaFailureInsight {
  id: string;
  type:
    | 'frequent_action_blocking'
    | 'frequent_flow_abandonment'
    | 'safety_edge_case'
    | 'confusing_guidance';
  description: string;
  evidence: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface MetaImprovementProposal {
  type: 'flow_issue' | 'safety_issue' | 'behavior_pattern' | 'module_gap';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
  suggestedFix: string;
  affectedModule: string;
}

export interface MetaInsightsBundle {
  generatedAt: string;
  patterns: MetaPatternInsight[];
  failures: MetaFailureInsight[];
  proposals: MetaImprovementProposal[];
}
