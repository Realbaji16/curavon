#!/usr/bin/env node

/**
 * Roll back auto-promoted product context overlays without deleting history.
 *
 * Usage:
 *   npm run forms:rollback-overlay -- <overlay_id>
 *   npm run forms:rollback-overlay -- --insight <insight_id>
 *   npm run forms:rollback-overlay -- --type module_trigger
 *   npm run forms:rollback-overlay -- --module fever_malaria_ng_v1
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFormImportPersistenceConfigured } from '../src/lib/form-insights/import/formImportExecution.ts';
import {
  normalizeLocalOverlayStore,
  parseOverlayRollbackArgs,
  rollbackLocalOverlayStore,
  rollbackOverlaysInSupabase,
  serializeLocalOverlayStore,
  summarizeRollbackForCli,
  type OverlayRollbackEvent,
} from '../src/lib/form-insights/promotion/overlayRollbackService.ts';
import { DEFAULT_LOCAL_OVERLAY_FILE } from '../src/lib/form-insights/runtime/activeOverlayLoader.ts';
import { getSupabaseAdminClient } from '../src/lib/supabase/adminClient.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(REPO_ROOT, 'data/form-imports/reports');
const ROLLBACK_EVENTS_PATH = path.join(REPORTS_DIR, 'latest-overlay-rollback-events.json');

function loadEnvLocal(): void {
  const envLocal = path.join(REPO_ROOT, '.env.local');
  if (!existsSync(envLocal)) return;

  for (const line of readFileSync(envLocal, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function appendLocalRollbackEvents(events: OverlayRollbackEvent[]): void {
  if (events.length === 0) return;

  mkdirSync(REPORTS_DIR, { recursive: true });
  const existing = existsSync(ROLLBACK_EVENTS_PATH)
    ? (JSON.parse(readFileSync(ROLLBACK_EVENTS_PATH, 'utf8')) as OverlayRollbackEvent[])
    : [];

  writeFileSync(
    ROLLBACK_EVENTS_PATH,
    `${JSON.stringify([...existing, ...events], null, 2)}\n`,
    'utf8',
  );
}

async function rollbackLocally(filter: ReturnType<typeof parseOverlayRollbackArgs>): Promise<void> {
  const overlayFile = DEFAULT_LOCAL_OVERLAY_FILE;
  if (!existsSync(overlayFile)) {
    throw new Error(`Local overlay file not found: ${overlayFile}`);
  }

  const parsed = JSON.parse(readFileSync(overlayFile, 'utf8')) as unknown;
  const store = normalizeLocalOverlayStore(parsed);
  const rolled = rollbackLocalOverlayStore(store, filter);

  writeFileSync(overlayFile, serializeLocalOverlayStore(rolled.store), 'utf8');
  appendLocalRollbackEvents(rolled.result.events);

  console.log('Overlay rollback complete (local JSON mode)');
  for (const line of summarizeRollbackForCli(rolled.result)) {
    console.log(`  ${line}`);
  }
  if (rolled.result.events.length > 0) {
    console.log(`  eventsLogged=${ROLLBACK_EVENTS_PATH}`);
  }
}

async function rollbackWithSupabase(filter: ReturnType<typeof parseOverlayRollbackArgs>): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error('Supabase admin client is not configured.');
  }

  const result = await rollbackOverlaysInSupabase(client, filter);
  appendLocalRollbackEvents(result.events);

  console.log('Overlay rollback complete (Supabase mode)');
  for (const line of summarizeRollbackForCli(result)) {
    console.log(`  ${line}`);
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const filter = parseOverlayRollbackArgs(process.argv.slice(2));

  if (isFormImportPersistenceConfigured()) {
    await rollbackWithSupabase(filter);
    return;
  }

  await rollbackLocally(filter);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Overlay rollback failed: ${message}`);
  process.exit(1);
});
