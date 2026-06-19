import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import type { HealthSnapshot } from '../../types/healthSnapshot';
import type { FollowUpRecord } from '../followUp/followUpTypes';
import type { FullFlowModel, FullFlowSection } from '../../types/fullFlow';

function categoryFocusLabel(category: NextActionState['category']): string {
  switch (category) {
    case 'track':
    case 'symptom_tracking':
      return 'track';
    case 'prepare':
    case 'doctor_prep':
      return 'prepare';
    case 'reduce_friction':
      return 'reduce friction';
    case 'escalate':
      return 'safety support';
    case 'stress':
      return 'stabilize';
    case 'sleep_energy':
      return 'stabilize';
    default:
      return 'stabilize';
  }
}

function inferFlowSource(state: NextActionState | null): FullFlowModel['source'] {
  if (!state) return 'fallback';
  const raw = (state.source ?? '').toLowerCase();
  if (raw.includes('ask')) return 'ask';
  if (raw.includes('guide')) return 'guide';
  if (raw.includes('follow')) return 'follow_up';
  if (state.fallbackUsed) return 'fallback';
  return 'today';
}

function isUrgentFlow(state: NextActionState | null): boolean {
  if (!state) return false;
  return state.safetyLevel === 'urgent' || state.category === 'escalate';
}

function buildContextBody(input: {
  state: NextActionState;
  snapshot?: HealthSnapshot | null;
  recentCheckins?: DailyCheckIn[];
}): string {
  const parts: string[] = [];
  const source = inferFlowSource(input.state);

  if (input.recentCheckins?.length) {
    parts.push('your recent check-in');
  }
  if (input.snapshot?.profileContext?.primaryGoalsSummary) {
    parts.push('saved health context');
  }
  parts.push('current action status');

  let lead = `Curavon is using ${parts.join(', ')}.`;
  if (source === 'ask') {
    lead += ' This step was shaped after an Ask conversation.';
  } else if (source === 'guide') {
    lead += ' This step connects to guided flow activity.';
  } else if (source === 'follow_up') {
    lead += ' This step follows a recent follow-up response.';
  }
  return lead;
}

function buildFocusBody(state: NextActionState, snapshot?: HealthSnapshot | null): string {
  const focus = categoryFocusLabel(state.category);
  const area = snapshot?.recommendedFocusArea?.replace(/_/g, ' ');
  if (area) {
    return `Current focus: ${focus}. Broader pattern area: ${area}.`;
  }
  return `Current focus: ${focus}. Curavon keeps one step at a time so the path stays manageable.`;
}

function buildAfterThisBody(
  state: NextActionState,
  dueFollowUp?: FollowUpRecord | null,
): string {
  if (isUrgentFlow(state)) {
    return 'Curavon should not turn urgent symptoms into a self-care sequence. Seek urgent medical support if symptoms are severe, sudden, or unsafe.';
  }

  const lines = [
    'After you try it, Curavon can ask whether it helped, felt blocked, or got worse.',
    'If it helped, Curavon can keep the step light.',
    'If it got worse or red flags appear, Curavon should move to safety guidance.',
  ];

  if (dueFollowUp?.status === 'pending') {
    lines.unshift('A gentle follow-up is already scheduled for this action.');
  } else if (state.followUpPrompt) {
    lines.unshift(state.followUpPrompt);
  }

  return lines.join(' ');
}

function buildGuideSection(state: NextActionState, snapshot?: HealthSnapshot | null): FullFlowSection | null {
  const hasGuideLink = Boolean(state.relatedGuide || state.relatedGuideFlowId);
  const recentGuide = snapshot?.guideActivity?.recentGuideTitles?.[0];
  if (!hasGuideLink && !recentGuide) return null;

  const guideName = state.relatedGuide ?? recentGuide;
  return {
    id: 'guide-link',
    type: 'guide',
    title: 'Related guide',
    body: guideName
      ? `This action can connect back to "${guideName}" in Guides.`
      : 'This action can connect back to a guided flow in Guides.',
    tone: 'supportive',
    actionLabel: 'Open Guides',
    actionTarget: 'guides',
  };
}

function buildActiveFlowModel(input: {
  state: NextActionState;
  snapshot?: HealthSnapshot | null;
  recentCheckins?: DailyCheckIn[];
  dueFollowUp?: FollowUpRecord | null;
}): FullFlowModel {
  const { state, snapshot, recentCheckins, dueFollowUp } = input;
  const urgent = isUrgentFlow(state);
  const safetyLevel =
    state.safetyLevel === 'urgent' || state.category === 'escalate'
      ? 'urgent'
      : state.safetyLevel === 'caution'
        ? 'caution'
        : 'normal';

  const sections: FullFlowSection[] = [];

  if (urgent) {
    sections.push({
      id: 'urgent-boundary',
      type: 'urgent_boundary',
      title: 'Safety boundary',
      body:
        'Some symptoms need urgent support. Curavon should not turn this into a self-care flow. If symptoms are severe, sudden, or unsafe, seek local emergency services or a clinician now.',
      tone: 'urgent',
    });
  }

  sections.push({
    id: 'context',
    type: 'context',
    title: 'What Curavon is responding to',
    body: buildContextBody({ state, snapshot, recentCheckins }),
    tone: 'neutral',
  });

  sections.push({
    id: 'safety',
    type: 'safety',
    title: 'Safety check',
    body: urgent
      ? 'Curavon is pausing normal self-care sequencing. This does not diagnose. Consider preparing questions for a clinician or pharmacist.'
      : 'No urgent red flag was selected in this flow. If serious symptoms appear, seek urgent support. This does not diagnose.',
    tone: urgent ? 'caution' : 'neutral',
  });

  if (!urgent) {
    sections.push({
      id: 'focus',
      type: 'focus',
      title: 'Current focus',
      body: buildFocusBody(state, snapshot),
      tone: 'supportive',
    });
  }

  sections.push({
    id: 'current-action',
    type: 'current_action',
    title: 'Your current next best action',
    body: state.reason
      ? `${state.currentAction}\n\nWhy this step: ${state.reason}`
      : state.currentAction,
    tone: urgent ? 'caution' : 'supportive',
  });

  if (!urgent) {
    sections.push({
      id: 'after-this',
      type: 'next_step',
      title: 'What happens after this',
      body: buildAfterThisBody(state, dueFollowUp),
      tone: 'neutral',
    });

    if (dueFollowUp?.status === 'pending') {
      sections.push({
        id: 'follow-up',
        type: 'follow_up',
        title: 'Follow-up',
        body: dueFollowUp.prompt || 'Curavon may ask how this step went when it is due.',
        tone: 'supportive',
      });
    }
  }

  sections.push({
    id: 'doctor-summary',
    type: 'doctor_summary',
    title: 'Doctor-ready note',
    body:
      state.relatedDoctorSummaryPrompt ??
      'Curavon can help turn this into a short note for a clinician if you want to discuss it.',
    tone: 'neutral',
    actionLabel: 'Prepare doctor note',
    actionTarget: 'doctor_summary',
  });

  const guideSection = buildGuideSection(state, snapshot);
  if (guideSection) sections.push(guideSection);

  return {
    id: state.actionId ?? `flow-${state.updatedAt}`,
    title: 'Your health flow',
    subtitle: 'The wider pathway behind today’s next step.',
    source: inferFlowSource(state),
    generatedAt: new Date().toISOString(),
    safetyLevel,
    currentAction: {
      title: state.title ?? "Today's next step",
      body: state.currentAction,
      status: state.status,
      source: state.source,
    },
    sections,
  };
}

function buildFallbackModel(): FullFlowModel {
  return {
    id: 'flow-fallback',
    title: 'Your health flow will appear here',
    subtitle: 'Once Curavon has a current next action, you’ll be able to see the wider flow behind it.',
    source: 'fallback',
    generatedAt: new Date().toISOString(),
    safetyLevel: 'normal',
    currentAction: {
      title: 'No current action yet',
      body: 'Complete a check-in, Ask Curavon, or try a guide to receive one safer next step.',
    },
    sections: [
      {
        id: 'fallback-checkin',
        type: 'context',
        title: 'Start with a check-in',
        body: 'Today’s check-in gives Curavon the signals needed for one clear next step.',
        tone: 'supportive',
        actionLabel: 'Back to Today',
        actionTarget: 'today',
      },
      {
        id: 'fallback-ask',
        type: 'focus',
        title: 'Ask Curavon',
        body: 'Share a concern or goal and answer guided questions for a safer next step.',
        tone: 'neutral',
        actionLabel: 'Open Ask',
        actionTarget: 'ask',
      },
      {
        id: 'fallback-guides',
        type: 'guide',
        title: 'Try a guide',
        body: 'Guides offer structured paths when you want more context before acting.',
        tone: 'neutral',
        actionLabel: 'Open Guides',
        actionTarget: 'guides',
      },
      {
        id: 'fallback-safety',
        type: 'safety',
        title: 'Safety reminder',
        body: 'Curavon does not diagnose. If urgent symptoms appear, seek urgent medical support.',
        tone: 'caution',
      },
    ],
  };
}

export function buildFullFlowModel(input: {
  nextActionState: NextActionState | null;
  healthSnapshot?: HealthSnapshot | null;
  healthProfile?: HealthProfile | null;
  recentCheckins?: DailyCheckIn[];
  dueFollowUp?: FollowUpRecord | null;
}): FullFlowModel {
  void input.healthProfile;

  if (!input.nextActionState?.currentAction?.trim()) {
    return buildFallbackModel();
  }

  return buildActiveFlowModel({
    state: input.nextActionState,
    snapshot: input.healthSnapshot,
    recentCheckins: input.recentCheckins,
    dueFollowUp: input.dueFollowUp,
  });
}
