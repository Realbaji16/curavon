import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFormImportPublicSummary,
  executeFormImportFromCsv,
} from '../lib/form-insights/import/formImportExecution';
import { validateFormImportUpload } from '../lib/form-insights/import/formImportUpload';
import { checkAdminFormImportAccess } from '../lib/server/formInsightAdminAccess';
import { handleAdminFormImportPost } from '../lib/server/formInsightImportHandler';

vi.mock('../lib/supabase/serverClient', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('../lib/server/formInsightPersistence', () => ({
  persistFormImportResult: vi.fn(),
}));

import { createSupabaseServerClient } from '../lib/supabase/serverClient';

const FIXTURE_CSV = [
  'Timestamp,Full Name,Email,What is your main concern?,State,I consent to research',
  '3/21/2026 10:00:00,Ada Okafor,ada@example.com,body hot since yesterday and took malaria drug without test,Lagos,Yes',
  '3/21/2026 11:00:00,John Doe,john@example.com,chemist first then chest pain and difficulty breathing,Abuja,Yes',
].join('\n');

function mockAuthenticatedUser(userId = 'user-test-123') {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as never);
}

function buildMultipartUpload(filename: string, content: string | Uint8Array) {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const file = new File([bytes], filename, { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.set('file', file);
  return new Request('http://localhost/api/admin/forms/import', {
    method: 'POST',
    body: formData,
  });
}

describe('Phase 3 admin form import execution', () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-admin callers via deferred admin guard', async () => {
    mockAuthenticatedUser();

    const access = checkAdminFormImportAccess({ userId: 'user-test-123' });
    expect(access.allowed).toBe(false);
    if (access.allowed) return;
    expect(access.status).toBe(403);
    expect(access.code).toBe('admin_roles_not_configured');

    const response = await handleAdminFormImportPost(
      buildMultipartUpload('Patient.csv', FIXTURE_CSV),
    );

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      error: 'admin_roles_not_configured',
    });
    expect(JSON.stringify(response.body)).not.toContain('Ada Okafor');
  });

  it('rejects invalid uploads before import', () => {
    const tooLarge = validateFormImportUpload({
      filename: 'export.csv',
      byteLength: 6 * 1024 * 1024,
    });
    expect(tooLarge.ok).toBe(false);
    if (tooLarge.ok) return;
    expect(tooLarge.code).toBe('file_too_large');

    const badExtension = validateFormImportUpload({
      filename: 'notes.txt',
      byteLength: 12,
    });
    expect(badExtension.ok).toBe(false);
    if (badExtension.ok) return;
    expect(badExtension.code).toBe('invalid_extension');
  });

  it('produces insights from a valid CSV import', () => {
    const result = executeFormImportFromCsv('Patient Pilot.csv', FIXTURE_CSV);
    const summary = buildFormImportPublicSummary(result);

    expect(summary.rowsImported).toBe(2);
    expect(summary.insightsGenerated).toBeGreaterThan(0);
    expect(summary.sourceRole).toBe('patient');
    expect(summary.reviewStatus).toBe('review');
    expect(summary.insights.length).toBe(summary.insightsGenerated);
  });

  it('does not return raw row answers in public import summary', () => {
    const result = executeFormImportFromCsv('Patient Pilot.csv', FIXTURE_CSV);
    const summary = buildFormImportPublicSummary(result);
    const serialized = JSON.stringify(summary);

    expect(serialized).not.toContain('ada@example.com');
    expect(serialized).not.toContain('Ada Okafor');
    expect(serialized).not.toContain('deidentifiedAnswers');
    expect(serialized).not.toContain('normalizedResponses');
    expect(summary).not.toHaveProperty('normalizedResponses');
  });
});
