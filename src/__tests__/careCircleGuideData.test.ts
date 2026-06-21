import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FLOW_CARD_IDS, FLOW_CARDS } from '../data/guides/flowCatalog';
import {
  ALL_GUIDES,
  BASIC_GUIDE_IDS,
  BASIC_GUIDES,
  MIND_GUIDE_IDS,
  MIND_GUIDES,
} from '../data/guides/guideCatalog';
import {
  FLOW_RUNNER_IDS,
  FLOW_RUNNERS,
  URGENT_FLOW_QUESTION_IDS,
} from '../data/guides/flowRunners';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const careCircleScreenSource = readFileSync(
  path.join(__dirname, '../screens/guides/CareCircleScreen.tsx'),
  'utf8',
);
const careCircleReexportSource = readFileSync(path.join(__dirname, '../screens/CareCircle.tsx'), 'utf8');

const EXPECTED_FLOW_IDS = [
  'something-feels-off',
  'doctor-visit-prep',
  'mood-stress-checkin',
  'monthly-wellness-review',
  'headache',
  'stomach-pain',
  'medication-review',
] as const;

const EXPECTED_MIND_GUIDE_IDS = [
  'understanding-stress-signals',
  'when-worry-feels-too-loud',
  'sleep-and-mood',
  'how-to-explain-feelings',
  'tiny-grounding-steps',
  'prepare-therapy-or-doctor-visit',
];

const EXPECTED_BASIC_GUIDE_IDS = [
  'track-symptoms-clearly',
  'what-to-tell-a-doctor',
  'when-to-seek-urgent-care',
  'how-to-notice-patterns',
  'medication-notes-to-keep',
];

const EXPECTED_URGENT_QUESTION_IDS = [
  'urgent',
  'safety',
  'month-urgent',
  'headache-urgent',
  'stomach-urgent',
  'med-urgent',
];

describe('Care Circle guide data modules', () => {
  it('exports FLOW_CARDS with expected flow IDs in order', () => {
    expect(FLOW_CARDS.length).toBe(EXPECTED_FLOW_IDS.length);
    expect(FLOW_CARD_IDS).toEqual([...EXPECTED_FLOW_IDS]);
    EXPECTED_FLOW_IDS.forEach((id) => {
      const card = FLOW_CARDS.find((flow) => flow.id === id);
      expect(card, `missing flow card ${id}`).toBeDefined();
      expect(card?.title.length).toBeGreaterThan(0);
      expect(card?.description.length).toBeGreaterThan(0);
    });
  });

  it('exports guide catalogs with expected guide IDs', () => {
    expect(MIND_GUIDE_IDS).toEqual(EXPECTED_MIND_GUIDE_IDS);
    expect(BASIC_GUIDE_IDS).toEqual(EXPECTED_BASIC_GUIDE_IDS);
    expect(ALL_GUIDES).toEqual([...MIND_GUIDES, ...BASIC_GUIDES]);
  });

  it('exports FLOW_RUNNERS for every flow card', () => {
    expect(FLOW_RUNNER_IDS.sort()).toEqual([...EXPECTED_FLOW_IDS].sort());
    EXPECTED_FLOW_IDS.forEach((id) => {
      expect(FLOW_RUNNERS[id]?.id).toBe(id);
      expect(FLOW_RUNNERS[id]?.nextStep.length).toBeGreaterThan(0);
    });
  });

  it('keeps urgent runner question markers', () => {
    expect([...URGENT_FLOW_QUESTION_IDS].sort()).toEqual([...EXPECTED_URGENT_QUESTION_IDS].sort());

    const urgentQuestion = FLOW_RUNNERS['something-feels-off'].questions?.find((q) => q.id === 'urgent');
    expect(urgentQuestion?.options).toContain('Chest pain');
    expect(urgentQuestion?.options).toContain('None of these');

    const safetyQuestion = FLOW_RUNNERS['mood-stress-checkin'].questions?.find((q) => q.id === 'safety');
    expect(safetyQuestion?.type).toBe('yesno');
    expect(safetyQuestion?.options).toEqual(['Yes', 'No', "I'm not sure"]);
  });

  it('CareCircle imports extracted guide data instead of inline catalogs', () => {
    expect(careCircleScreenSource).toMatch(/from ['"]\.\.\/\.\.\/data\/guides\/flowCatalog['"]/);
    expect(careCircleScreenSource).toMatch(/from ['"]\.\.\/\.\.\/data\/guides\/guideCatalog['"]/);
    expect(careCircleScreenSource).toMatch(/from ['"]\.\.\/\.\.\/data\/guides\/flowRunners['"]/);
    expect(careCircleScreenSource).toMatch(/\bFLOW_CARDS\b/);
    expect(careCircleScreenSource).toMatch(/\bMIND_GUIDES\b/);
    expect(careCircleScreenSource).toMatch(/\bBASIC_GUIDES\b/);
    expect(careCircleScreenSource).toMatch(/\bFLOW_RUNNERS\b/);
    expect(careCircleScreenSource).not.toMatch(/const FLOW_CARDS:/);
    expect(careCircleScreenSource).not.toMatch(/const MIND_GUIDES:/);
    expect(careCircleScreenSource).not.toMatch(/const FLOW_RUNNERS:/);
    expect(careCircleScreenSource).toMatch(/flowUrgentTerminal/);
    expect(careCircleScreenSource).toMatch(/pendingGuideFlowId/);
    expect(careCircleReexportSource).toMatch(/CareCircleScreen/);
  });
});
