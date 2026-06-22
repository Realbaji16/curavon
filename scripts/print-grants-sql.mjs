#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const grantsPath = path.join(root, 'supabase/migrations/20250618100004_curavon_table_grants.sql');
const sql = readFileSync(grantsPath, 'utf8');

console.log('\n=== Copy everything below into Supabase SQL Editor ===\n');
console.log('Open: https://supabase.com/dashboard/project/mprfgqnmtobbqycvtatd/sql/new\n');
console.log(sql);
console.log('\n=== Then click Run, reload Curavon, and run: npm run check:supabase ===\n');
