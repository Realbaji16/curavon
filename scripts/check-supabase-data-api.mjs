#!/usr/bin/env node
/**
 * Probes whether Curavon tables are reachable via the Supabase Data API.
 * Run: node scripts/check-supabase-data-api.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in env or .env.local.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocal = path.join(__dirname, '..', '.env.local');

function loadEnvLocal() {
  if (!existsSync(envLocal)) return;
  for (const line of readFileSync(envLocal, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  process.exit(1);
}

const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'YOUR_PROJECT_REF';
const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
const grantsFile = path.join(__dirname, '..', 'supabase', 'migrations', '20250618100004_curavon_table_grants.sql');

const response = await fetch(`${url}/rest/v1/health_profiles?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

const body = await response.text();
let parsed;
try {
  parsed = JSON.parse(body);
} catch {
  parsed = { message: body };
}

if (response.status === 401 && parsed.code === '42501') {
  console.log('\nCuravon Supabase check: FAILED (table grants missing)\n');
  console.log('PostgREST returned 42501 permission denied for health_profiles.');
  console.log('Your schema/RLS migrations ran, but the Data API cannot reach tables yet.\n');
  console.log('Fix — run this SQL in the Supabase SQL Editor:');
  console.log(`  ${sqlEditorUrl}\n`);
  if (existsSync(grantsFile)) {
    console.log('Paste the contents of:');
    console.log(`  supabase/migrations/20250618100004_curavon_table_grants.sql\n`);
  }
  console.log('Or from the repo root:');
  console.log('  supabase login');
  console.log(`  supabase link --project-ref ${projectRef}`);
  console.log('  supabase db push\n');
  process.exit(1);
}

if (response.ok || parsed.code === 'PGRST116' || response.status === 200) {
  console.log('\nCuravon Supabase check: OK (health_profiles reachable via Data API)\n');
  process.exit(0);
}

console.log('\nCuravon Supabase check: unexpected response');
console.log('Status:', response.status);
console.log('Body:', body.slice(0, 300));
process.exit(1);
