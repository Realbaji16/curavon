import { describe, expect, it } from 'vitest';
import { runFormImport } from '../lib/form-insights/import/formImportService';
import {
  buildFormInsightReportFromImportResult,
  buildFormInsightReportMarkdown,
} from '../lib/form-insights/reports/formInsightReportBuilder';

const FIXTURE_CSV = [
  'Timestamp,Full Name,Email,What is your main concern?,State,I consent to research',
  '3/21/2026 10:00:00,Ada Okafor,ada@example.com,body hot since yesterday and took malaria drug without test,Lagos,Yes',
  '3/21/2026 11:00:00,John Doe,john@example.com,chemist first then chest pain and difficulty breathing,Abuja,Yes',
  '3/21/2026 12:00:00,Jane Smith,jane@example.com,hospital queue too long and drugs too expensive,Rivers,Yes',
  '3/21/2026 13:00:00,Test User,test@example.com,Curavon should tell users to stop the drug when itching,Kano,Yes',
  '3/21/2026 14:00:00,User Five,five@example.com,Widal confusing and wish the app had visit checklist,Lagos,Yes',
].join('\n');

const REQUIRED_SECTIONS = [
  '## Executive Summary',
  '## Source Mix',
  '## Limitations',
  '## Common Concern Signals',
  '## Nigerian Language/Phrase Signals',
  '## Care Blockers',
  '## Care Routes',
  '## Medication Safety Patterns',
  '## Red Flag Candidates',
  '## Summary Field Candidates',
  '## Trust/Distrust Wording',
  '## Privacy Requirements',
  '## Feature Requests',
  '## Module Mapping',
  '## Do Not Promote Without Review',
  '## Recommended Product Changes',
  '## Recommended Guardrail Changes',
  '## Next Data Needed',
] as const;

const MANDATORY_DISCLAIMERS = [
  'product research evidence, not clinical evidence',
  'All medical and safety-related product changes require human review',
  'Sample size is low',
] as const;

describe('formInsightReportBuilder', () => {
  it('renders all required report sections', () => {
    const result = runFormImport({
      sourceName: 'report-fixture',
      sourceRole: 'patient',
      filename: 'Patient Pilot.csv',
      csvText: FIXTURE_CSV,
      batchId: 'batch_report_builder',
    });

    const report = buildFormInsightReportFromImportResult(result);

    for (const section of REQUIRED_SECTIONS) {
      expect(report).toContain(section);
    }
  });

  it('states mandatory safety disclaimers in every report', () => {
    const report = buildFormInsightReportMarkdown({
      sourceName: 'empty-batch',
      filename: 'Empty.csv',
      sourceRole: 'unknown',
      batchId: 'batch_empty',
      importedAt: '2026-03-21T12:00:00.000Z',
      rowCount: 0,
      normalizedResponses: [],
      insights: [],
      moduleMappings: [],
    });

    for (const disclaimer of MANDATORY_DISCLAIMERS) {
      expect(report).toContain(disclaimer);
    }
  });

  it('includes support counts and source roles for extracted insights', () => {
    const result = runFormImport({
      sourceName: 'counts-fixture',
      sourceRole: 'patient',
      filename: 'Patient.csv',
      csvText: FIXTURE_CSV,
      batchId: 'batch_counts',
    });

    const report = buildFormInsightReportFromImportResult(result);

    expect(report).toMatch(/support: \d+/);
    expect(report).toMatch(/roles: (patient|unknown)/);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('does not quote long raw answers or include PII', () => {
    const result = runFormImport({
      sourceName: 'privacy-fixture',
      sourceRole: 'patient',
      filename: 'Patient.csv',
      csvText: FIXTURE_CSV,
      batchId: 'batch_privacy',
    });

    const report = buildFormInsightReportFromImportResult(result);

    expect(report).not.toContain('ada@example.com');
    expect(report).not.toContain('Ada Okafor');
    expect(report).not.toContain('deidentifiedAnswers');

    const longAnswer =
      'body hot since yesterday and took malaria drug without test and also chemist first then chest pain';
    expect(report).not.toContain(longAnswer);
  });

  it('avoids diagnosis and prescription recommendation language', () => {
    const result = runFormImport({
      sourceName: 'safety-language-fixture',
      sourceRole: 'patient',
      filename: 'Patient.csv',
      csvText: FIXTURE_CSV,
      batchId: 'batch_safety_language',
    });

    const report = buildFormInsightReportFromImportResult(result);

    expect(report).not.toMatch(/you should (take|stop|start) /i);
    expect(report).toContain('does **not** diagnose conditions, prescribe treatment');
    expect(report).toContain('not clinical recommendations');
  });
});
