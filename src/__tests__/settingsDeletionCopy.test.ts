import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settingsSource = readFileSync(path.join(__dirname, '../screens/Settings.tsx'), 'utf8');

describe('Settings account deletion copy', () => {
  it('explains deletion is immediate for Supabase profile data and signing out is not deletion', () => {
    expect(settingsSource).toMatch(/removes your Curavon profile and health data from Supabase/i);
    expect(settingsSource).toMatch(/Signing out does not delete your account/i);
  });

  it('mentions pending deletion status for health data requests', () => {
    expect(settingsSource).toMatch(/pending deletion status/i);
    expect(settingsSource).toMatch(/not the same as signing out/i);
  });

  it('submits full-account deletion to Supabase before signing out', () => {
    expect(settingsSource).toMatch(/requestAccountDeletion\(\)/);
    expect(settingsSource).toMatch(/if \(isSupabaseMode\)/);
  });
});
