import { describe, expect, it } from 'vitest';
import {
  buildFormInsightReportMarkdown,
  runFormImport,
} from '../lib/form-insights/import/formImportService';

const FIXTURE_CSV = [
  'Timestamp,Full Name,Email,What is your main concern?,State,I consent to research',
  '3/21/2026 10:00:00,Ada Okafor,ada@example.com,body hot since yesterday and took malaria drug without test,Lagos,Yes',
  '3/21/2026 11:00:00,John Doe,john@example.com,chemist first then chest pain and difficulty breathing,Abuja,Yes',
  '3/21/2026 12:00:00,Jane Smith,jane@example.com,hospital queue too long and drugs too expensive,Rivers,Yes',
  '3/21/2026 13:00:00,Test User,test@example.com,Curavon should tell users to stop the drug when itching,Kano,Yes',
  '3/21/2026 14:00:00,User Five,five@example.com,Widal confusing and wish the app had visit checklist,Lagos,Yes',
].join('\n');

describe('runFormImport', () => {
  it('parses, redacts, extracts, and maps modules without Supabase', () => {
    const result = runFormImport({
      sourceName: 'pilot-fixture',
      sourceRole: 'patient',
      filename: 'Patient Pilot.csv',
      csvText: FIXTURE_CSV,
      batchId: 'batch_test_fixture',
    });

    expect(result.batchId).toBe('batch_test_fixture');
    expect(result.rowCount).toBe(5);
    expect(result.normalizedResponses).toHaveLength(5);
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.moduleMappings).toHaveLength(result.insights.length);

    for (const response of result.normalizedResponses) {
      expect(response.deidentifiedAnswers).not.toHaveProperty('Full Name');
      expect(response.deidentifiedAnswers).not.toHaveProperty('Email');
      expect(JSON.stringify(response.deidentifiedAnswers)).not.toContain('ada@example.com');
    }

    expect(
      result.insights.some((insight) => insight.insightType === 'common_concern'),
    ).toBe(true);
    expect(
      result.insights.some((insight) => insight.insightType === 'care_blocker'),
    ).toBe(true);
    expect(
      result.insights.some((insight) => insight.insightType === 'red_flag_candidate'),
    ).toBe(true);
    expect(
      result.insights.some(
        (insight) => insight.insightType === 'professional_opinion_conflict',
      ),
    ).toBe(true);

    for (const insight of result.insights) {
      expect(insight.medicalTruth).toBe(false);
      expect(insight.confidence).toBe('low');
      expect(insight.evidence.supportCount).toBeGreaterThanOrEqual(1);
      expect(insight.evidence.rowRefs.length).toBeGreaterThanOrEqual(1);
    }

    expect(result.promotionSummary).toBeDefined();
    expect(result.overlays).toBeDefined();
    expect(result.promotion.decisions).toHaveLength(result.insights.length);

    const feverMapping = result.moduleMappings.find((mapping) =>
      mapping.linkedModules.some((link) => link.moduleId === 'fever_malaria_ng_v1'),
    );
    expect(feverMapping).toBeDefined();
  });

  it('uses filename role detection when sourceRole is unknown', () => {
    const result = runFormImport({
      sourceName: 'pharmacy-export',
      sourceRole: 'unknown',
      filename: 'Pharmacy Feedback.csv',
      csvText: 'Timestamp,Concern\n3/21/2026 10:00:00,antibiotics without prescription\n',
    });

    expect(result.sourceRole).toBe('pharmacy');
    expect(result.rowCount).toBe(1);
  });

  it('builds a markdown report with required sections and no raw PII', () => {
    const result = runFormImport({
      sourceName: 'report-fixture',
      sourceRole: 'doctor',
      filename: 'Doctor.csv',
      csvText: FIXTURE_CSV,
      batchId: 'batch_report',
    });

    const report = buildFormInsightReportMarkdown(result);

    expect(report).toContain('## Executive Summary');
    expect(report).toContain('## Auto-Promotion Summary');
    expect(report).toContain('## Common Concern Signals');
    expect(report).toContain('## Module Mapping');
    expect(report).toContain('## Limitations');
    expect(report).not.toContain('ada@example.com');
    expect(report).not.toContain('Ada Okafor');
  });
});
