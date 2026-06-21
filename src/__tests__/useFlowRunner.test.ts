import { createElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FLOW_RUNNERS } from '../data/guides/flowRunners';
import { useFlowRunner } from '../hooks/guides/useFlowRunner';

function mountHook<T>(useHook: () => T) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const ref: { current: T | null } = { current: null };

  function Harness() {
    ref.current = useHook();
    return null;
  }

  act(() => {
    root.render(createElement(Harness));
  });

  return {
    get: () => {
      if (!ref.current) throw new Error('Hook not mounted');
      return ref.current;
    },
    act: (fn: () => void) => act(fn),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const careCircleScreenSource = readFileSync(
  path.join(__dirname, '../screens/guides/CareCircleScreen.tsx'),
  'utf8',
);

describe('useFlowRunner', () => {
  const somethingRunner = FLOW_RUNNERS['something-feels-off'];

  it('starts at step zero with no answers', () => {
    const mounted = mountHook(() => useFlowRunner({ runner: somethingRunner }));
    const runner = mounted.get();
    expect(runner.stepIndex).toBe(0);
    expect(runner.currentQuestion?.id).toBe('noticeable');
    expect(runner.canContinue).toBe(false);
    expect(runner.flowUrgentTerminal).toBe(false);
    mounted.unmount();
  });

  it('updates answers and canContinue', () => {
    const mounted = mountHook(() => useFlowRunner({ runner: somethingRunner }));
    mounted.act(() => {
      const runner = mounted.get();
      runner.setAnswer(runner.currentQuestion!, 'Pain or discomfort');
    });
    const runner = mounted.get();
    expect(runner.answers.noticeable).toBe('Pain or discomfort');
    expect(runner.canContinue).toBe(true);
    mounted.unmount();
  });

  it('cannot continue when required answer is missing', () => {
    const mounted = mountHook(() => useFlowRunner({ runner: somethingRunner }));
    mounted.act(() => {
      const result = mounted.get().goNext({ safetyAcknowledged: false });
      expect(result.outcome).toBe('blocked');
    });
    expect(mounted.get().stepIndex).toBe(0);
    mounted.unmount();
  });

  it('advances steps on non-urgent answers', () => {
    const mounted = mountHook(() => useFlowRunner({ runner: somethingRunner }));
    mounted.act(() => {
      mounted.get().setAnswer(mounted.get().currentQuestion!, 'Pain or discomfort');
    });
    mounted.act(() => {
      const result = mounted.get().goNext({ safetyAcknowledged: false });
      expect(result.outcome).toBe('advanced');
    });
    expect(mounted.get().stepIndex).toBe(1);
    expect(mounted.get().currentQuestion?.id).toBe('duration');
    mounted.unmount();
  });

  it('goes back and exits at first step', () => {
    const mounted = mountHook(() => useFlowRunner({ runner: somethingRunner }));
    mounted.act(() => {
      expect(mounted.get().goBack().outcome).toBe('exit');
    });
    mounted.act(() => {
      mounted.get().setAnswer(mounted.get().currentQuestion!, 'Pain or discomfort');
    });
    mounted.act(() => {
      mounted.get().goNext({ safetyAcknowledged: false });
    });
    mounted.act(() => {
      const result = mounted.get().goBack();
      expect(result.outcome).toBe('back');
    });
    expect(mounted.get().stepIndex).toBe(0);
    mounted.unmount();
  });

  it('routes urgent answers to safety interrupt path', () => {
    const mounted = mountHook(() => useFlowRunner({ runner: somethingRunner }));
    const questions = somethingRunner.questions ?? [];

    questions.slice(0, -1).forEach((question) => {
      mounted.act(() => {
        const runner = mounted.get();
        if (question.type === 'scale') {
          runner.setAnswer(question, 5);
        } else if (question.type === 'shortText') {
          runner.setAnswer(question, 'nothing');
        } else {
          runner.setAnswer(question, question.options?.[0] ?? 'Pain or discomfort');
        }
      });
      mounted.act(() => {
        const result = mounted.get().goNext({ safetyAcknowledged: false });
        expect(result.outcome).toBe('advanced');
      });
    });

    mounted.act(() => {
      mounted.get().setAnswer(mounted.get().currentQuestion!, ['Chest pain']);
    });
    mounted.act(() => {
      const result = mounted.get().goNext({ safetyAcknowledged: false });
      expect(result.outcome).toBe('urgent-interrupt');
      if (result.outcome === 'urgent-interrupt') {
        expect(result.urgent.urgent.hasUrgent).toBe(true);
      }
    });
    expect(mounted.get().flowUrgentTerminal).toBe(true);
    mounted.unmount();
  });

  it('resets runner state', () => {
    const mounted = mountHook(() => useFlowRunner({ runner: somethingRunner }));
    mounted.act(() => {
      mounted.get().setAnswer(mounted.get().currentQuestion!, 'Pain or discomfort');
      mounted.get().goNext({ safetyAcknowledged: false });
      mounted.get().reset();
    });
    const runner = mounted.get();
    expect(runner.stepIndex).toBe(0);
    expect(runner.answers).toEqual({});
    expect(runner.flowUrgentTerminal).toBe(false);
    mounted.unmount();
  });

  it('CareCircle uses extracted runner hook and utilities', () => {
    expect(careCircleScreenSource).toMatch(/from ['"]\.\.\/\.\.\/hooks\/guides\/useFlowRunner['"]/);
    expect(careCircleScreenSource).toMatch(/from ['"]\.\.\/\.\.\/hooks\/guides\/useFlowCompletion['"]/);
    expect(careCircleScreenSource).toMatch(/from ['"]\.\.\/\.\.\/lib\/guides\/flowRunnerUtils['"]/);
    expect(careCircleScreenSource).toMatch(/useFlowRunner\(/);
    expect(careCircleScreenSource).toMatch(/useFlowCompletion\(/);
    expect(careCircleScreenSource).not.toMatch(/function isAnswered\(/);
    expect(careCircleScreenSource).not.toMatch(/function formatAnswer\(/);
    expect(careCircleScreenSource).not.toMatch(/const \[runnerStep, setRunnerStep\]/);
    expect(careCircleScreenSource).not.toMatch(/generateCuravonNextAction/);
    expect(careCircleScreenSource).toMatch(/flowUrgentTerminal/);
    expect(careCircleScreenSource).toMatch(/pendingGuideFlowId/);
  });
});
