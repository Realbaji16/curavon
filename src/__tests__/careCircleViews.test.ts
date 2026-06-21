import { createElement, type ReactElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FLOW_CARDS } from '../data/guides/flowCatalog';
import { BASIC_GUIDES, MIND_GUIDES } from '../data/guides/guideCatalog';
import { FLOW_RUNNERS } from '../data/guides/flowRunners';
import { CareCircleScreen } from '../screens/guides/CareCircleScreen';
import { FlowDetailView } from '../screens/guides/FlowDetailView';
import { FlowResultView } from '../screens/guides/FlowResultView';
import { FlowRunnerView } from '../screens/guides/FlowRunnerView';
import { FlowSafetyTerminalView } from '../screens/guides/FlowSafetyTerminalView';
import { GuideDetailView } from '../screens/guides/GuideDetailView';
import { GuidesBrowseView } from '../screens/guides/GuidesBrowseView';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const careCircleScreenSource = readFileSync(
  path.join(__dirname, '../screens/guides/CareCircleScreen.tsx'),
  'utf8',
);
const careCircleReexportSource = readFileSync(path.join(__dirname, '../screens/CareCircle.tsx'), 'utf8');

function renderIntoDom(element: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const mockShowToast = vi.fn();
const mockOpenDoctorSummary = vi.fn();
const mockClearPendingGuideFlow = vi.fn();
const mockSetActiveTab = vi.fn();
const mockAddFromFlow = vi.fn();
const mockLogRedFlag = vi.fn();
const mockOpenUrgentSafety = vi.fn();
const mockCloseUrgentSafety = vi.fn();
const mockRefreshHealthSnapshot = vi.fn();

vi.mock('../context/useApp', () => ({
  useApp: () => ({
    showToast: mockShowToast,
    openDoctorSummary: mockOpenDoctorSummary,
    pendingGuideFlowId: null,
    clearPendingGuideFlow: mockClearPendingGuideFlow,
    setActiveTab: mockSetActiveTab,
  }),
}));

vi.mock('../context/useDoctorSummary', () => ({
  useDoctorSummary: () => ({
    addFromFlow: mockAddFromFlow,
    logRedFlag: mockLogRedFlag,
  }),
}));

vi.mock('../context/useHealth', () => ({
  useHealth: () => ({
    openUrgentSafety: mockOpenUrgentSafety,
    closeUrgentSafety: mockCloseUrgentSafety,
    healthSnapshot: {},
    nextActionState: null,
    healthProfile: null,
    refreshHealthSnapshot: mockRefreshHealthSnapshot,
  }),
}));

vi.mock('../hooks/useScreenBack', () => ({
  useScreenBack: vi.fn(),
}));

vi.mock('../components/ScreenHeader', () => ({
  ScreenHeader: ({ title }: { title: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- vitest mock factory
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'screen-header' }, title);
  },
}));

vi.mock('../lib/plan/nextActionAdapter', () => ({
  generateCuravonNextAction: vi.fn().mockResolvedValue({
    actionId: 'guide-v2-test',
    title: 'Test step',
    actionText: 'Take one small step',
    reason: 'Test reason',
    category: 'general',
    safetyLevel: 'safe',
    sourceSignals: [],
    selectedBy: 'rules',
    aiReasoned: false,
    fallbackUsed: true,
  }),
}));

describe('Care Circle view components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GuidesBrowseView renders browse sections', () => {
    const { container, unmount } = renderIntoDom(
      createElement(GuidesBrowseView, {
        onOpenFlowDetail: vi.fn(),
        onOpenGuideDetail: vi.fn(),
      }),
    );
    expect(container.textContent).toContain('Start a guided flow');
    expect(container.textContent).toContain('For your mind');
    expect(container.textContent).toContain('Health basics');
    expect(container.querySelector('.guides-search-input')).not.toBeNull();
    unmount();
  });

  it('FlowDetailView renders start flow action', () => {
    const flow = FLOW_CARDS[0];
    const { container, unmount } = renderIntoDom(
      createElement(FlowDetailView, {
        flow,
        onStartFlow: vi.fn(),
      }),
    );
    expect(container.textContent).toContain(flow.title);
    expect(container.textContent).toContain('Start Flow');
    unmount();
  });

  it('FlowRunnerView renders runner step UI', () => {
    const runner = FLOW_RUNNERS['something-feels-off'];
    const question = runner.questions![0];
    const { container, unmount } = renderIntoDom(
      createElement(FlowRunnerView, {
        runner,
        runnerStep: 0,
        currentQuestion: question,
        currentAnswer: undefined,
        canContinue: false,
        showMoodSafetyMessage: false,
        showGuidesSafety: false,
        guidesSafetyTitle: 'Safety',
        guidesSafetyBody: '',
        onSetAnswer: vi.fn(),
        onToggleMultiOption: vi.fn(),
        onBack: vi.fn(),
        onNext: vi.fn(),
        onPrepareSummaryFromSafety: vi.fn(),
        onContinueToSafetyTerminal: vi.fn(),
      }),
    );
    expect(container.textContent).toContain('Step 1 of');
    expect(container.textContent).toContain(question.prompt);
    unmount();
  });

  it('FlowSafetyTerminalView renders escalation copy', () => {
    const { container, unmount } = renderIntoDom(
      createElement(FlowSafetyTerminalView, {
        guidesSafetyBody: 'Urgent support may be needed.',
        onOpenDoctorSummary: vi.fn(),
        onBackToBrowse: vi.fn(),
        onReturnToToday: vi.fn(),
        onRestartFlow: vi.fn(),
      }),
    );
    expect(container.textContent).toContain('Safety check');
    expect(container.textContent).toContain('Urgent support may be needed.');
    expect(container.textContent).toContain('will not suggest a normal self-care step');
    unmount();
  });

  it('FlowResultView renders result summary blocks', () => {
    const flow = FLOW_CARDS[0];
    const runner = FLOW_RUNNERS[flow.id];
    const { container, unmount } = renderIntoDom(
      createElement(FlowResultView, {
        flow,
        runner,
        runnerAnswers: { noticeable: 'Low energy' },
        flowPlanAction: null,
        resultSaved: false,
        doctorDraftSaved: false,
        onSaveResult: vi.fn(),
        onSaveDoctorDraft: vi.fn(),
        onOpenDoctorSummary: vi.fn(),
      }),
    );
    expect(container.textContent).toContain(`${flow.title} — Result`);
    expect(container.textContent).toContain('What you shared');
    expect(container.textContent).toContain('Save to Doctor Summary');
    unmount();
  });

  it('GuideDetailView renders guide content', () => {
    const guide = MIND_GUIDES[0];
    const { container, unmount } = renderIntoDom(
      createElement(GuideDetailView, {
        guide,
        saved: false,
        onSaveGuide: vi.fn(),
        onOpenRelatedFlow: vi.fn(),
      }),
    );
    expect(container.textContent).toContain(guide.title);
    expect(container.textContent).toContain(guide.bullets[0]);
    expect(container.textContent).toContain('Related flow');
    unmount();
  });
});

describe('CareCircleScreen router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders browse view by default', () => {
    const { container, unmount } = renderIntoDom(createElement(CareCircleScreen));
    expect(container.querySelector('.guides-screen')).not.toBeNull();
    expect(container.textContent).toContain('Start a guided flow');
    unmount();
  });

  it('routes to flowDetail when a flow card is selected', () => {
    const { container, unmount } = renderIntoDom(createElement(CareCircleScreen));
    const firstFlowTitle = FLOW_CARDS[0].title;
    const flowButton = Array.from(container.querySelectorAll('.guides-flow-card')).find((node) =>
      node.textContent?.includes(firstFlowTitle),
    ) as HTMLButtonElement | undefined;
    expect(flowButton).toBeDefined();
    act(() => {
      flowButton?.click();
    });
    expect(container.textContent).toContain('Start Flow');
    expect(container.textContent).toContain(firstFlowTitle);
    unmount();
  });

  it('routes to flowRunner when start flow is clicked', () => {
    const { container, unmount } = renderIntoDom(createElement(CareCircleScreen));
    const flowButton = container.querySelector('.guides-flow-card') as HTMLButtonElement;
    act(() => {
      flowButton.click();
    });
    const startButton = Array.from(container.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('Start Flow'),
    ) as HTMLButtonElement | undefined;
    act(() => {
      startButton?.click();
    });
    expect(container.textContent).toContain('Step 1 of');
    unmount();
  });

  it('routes to guideDetail when a guide is opened', () => {
    const { container, unmount } = renderIntoDom(createElement(CareCircleScreen));
    const guide = BASIC_GUIDES[0];
    const guideButton = Array.from(container.querySelectorAll('.guides-basic-card')).find((node) =>
      node.textContent?.includes(guide.title),
    ) as HTMLButtonElement | undefined;
    act(() => {
      guideButton?.click();
    });
    expect(container.textContent).toContain(guide.title);
    expect(container.textContent).toContain('Related flow');
    unmount();
  });

  it('uses split view components for each view mode', () => {
    expect(careCircleScreenSource).toMatch(/GuidesBrowseView/);
    expect(careCircleScreenSource).toMatch(/FlowDetailView/);
    expect(careCircleScreenSource).toMatch(/FlowRunnerView/);
    expect(careCircleScreenSource).toMatch(/FlowResultView/);
    expect(careCircleScreenSource).toMatch(/FlowSafetyTerminalView/);
    expect(careCircleScreenSource).toMatch(/GuideDetailView/);
    expect(careCircleScreenSource).toMatch(/viewMode === 'browse'/);
    expect(careCircleScreenSource).toMatch(/viewMode === 'flowSafetyTerminal'/);
    expect(careCircleScreenSource).toMatch(/flowUrgentTerminal/);
    expect(careCircleScreenSource).toMatch(/pendingGuideFlowId/);
    expect(careCircleScreenSource).toMatch(/handlePendingGuideFlow/);
    expect(careCircleScreenSource).toMatch(/useFlowCompletion/);
    expect(careCircleScreenSource).toMatch(/completeFlow/);
    expect(careCircleScreenSource).not.toMatch(/saveFlowToDoctorSummary/);
    expect(careCircleScreenSource).not.toMatch(/generateCuravonNextAction/);
  });

  it('keeps CareCircle.tsx as compatibility re-export', () => {
    expect(careCircleReexportSource).toMatch(/from '\.\/guides\/CareCircleScreen'/);
    expect(careCircleReexportSource).toMatch(/CareCircleScreen as default/);
  });
});

describe('CareCircle urgent and completion routing', () => {
  it('documents urgent terminal and result guards in controller', () => {
    expect(careCircleScreenSource).toMatch(/outcome === 'urgent-terminal'/);
    expect(careCircleScreenSource).toMatch(/setViewMode\('flowSafetyTerminal'\)/);
    expect(careCircleScreenSource).toMatch(/outcome === 'completed'/);
    expect(careCircleScreenSource).toMatch(/setViewMode\('flowResult'\)/);
    expect(careCircleScreenSource).toMatch(/!flowUrgentTerminal/);
  });
});
