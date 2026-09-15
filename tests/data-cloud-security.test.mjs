import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { localDateKey, parseLocalDateKey } from '../src/utils/date.ts';

const read = path => readFile(path, 'utf8');

test('primary API is cloud-first and sends authenticated requests to the Edge Function', async () => {
  const source = await read('src/utils/api.ts');
  assert.match(source, /fetch\(`\$\{BASE_URL\}\$\{path\}`/);
  assert.match(source, /Authorization.*Bearer/);
  assert.match(source, /headers\.set\('apikey',\s*publicAnonKey\)/);
  assert.match(source, /x-lifeos-date/);
  assert.doesNotMatch(source, /function\s+dispatch\s*\(/);
  assert.doesNotMatch(source, /async\s+function\s+dispatch\s*\(/);
});

test('document uploads use multipart cloud upload instead of base64 persistence', async () => {
  const api = await read('src/utils/api.ts');
  const server = await read('supabase/functions/server/index.tsx');
  assert.match(api, /apiUpload[\s\S]*body:\s*formData/);
  assert.doesNotMatch(api, /FileReader\s*\(/);
  assert.doesNotMatch(api, /readAsDataURL\s*\(/);
  assert.match(server, /storage\.from\(BUCKET\)\.upload/);
  assert.match(server, /createSignedUrl/);
});

test('legacy local-only data migrates only after authenticated cloud acceptance', async () => {
  const source = await read('src/utils/api.ts');
  assert.match(source, /migration\/local-store/);
  assert.match(source, /isLegacyKeyForUser/);
  assert.match(source, /migratedKeys\.forEach/);
  assert.match(source, /localStorage\.removeItem\(LEGACY_STORE_KEY\)/);
  const server = await read('supabase/functions/server/index.tsx');
  assert.match(server, /Never let an old device-local snapshot overwrite data that already reached cloud storage/);
  assert.match(server, /skippedExisting/);
});

test('logout clears legacy LifeOS data and notification state even if network revocation fails', async () => {
  const source = await read('src/utils/auth.ts');
  assert.match(source, /clearLocalUserData\(\)/);
  assert.match(source, /localStorage\.removeItem\('lifeos_data'\)/);
  assert.match(source, /startsWith\('lifeos_notification_'\)/);
  assert.match(source, /signOut\(\{\s*scope:\s*'local'\s*\}\)/);
});

test('offline JWT fallback rejects expired cached access tokens', async () => {
  const source = await read('src/utils/auth.ts');
  assert.match(source, /payload\.exp/);
  assert.match(source, /Number\(payload\.exp\)\s*<=\s*nowSeconds/);
  assert.match(source, /cached session is expired or invalid/);
});

test('local date key follows Gulf local midnight instead of UTC midnight', () => {
  const oldTz = process.env.TZ;
  process.env.TZ = 'Asia/Riyadh';
  try {
    assert.equal(localDateKey(new Date('2026-09-10T21:30:00Z')), '2026-09-11');
    const parsed = parseLocalDateKey('2026-09-11');
    assert.equal(parsed?.getFullYear(), 2026);
    assert.equal(parsed?.getMonth(), 8);
    assert.equal(parsed?.getDate(), 11);
  } finally {
    if (oldTz === undefined) delete process.env.TZ; else process.env.TZ = oldTz;
  }
});

test('local date helper is used for today instead of UTC date slicing in the app source', async () => {
  const files = [
    'src/app/components/HabitsPage.tsx',
    'src/app/components/TasksPage.tsx',
    'src/app/components/FinancePage.tsx',
    'src/app/components/Dashboard.tsx',
    'src/app/components/MobileHome.tsx',
    'src/app/components/EventsPage.tsx',
    'src/app/components/JournalPage.tsx',
    'src/app/components/StudyPage.tsx',
    'src/app/components/AgreementsPage.tsx',
    'src/app/components/GoalsPage.tsx',
    'src/app/components/FitnessPage.tsx',
    'src/app/components/ReligiousPage.tsx',
    'src/app/components/AnalyticsPage.tsx',
    'src/app/components/AIAssistantPage.tsx',
    'src/utils/notifications.ts',
  ];
  const bad = /new Date\(\)\.toISOString\(\)\.(?:split\('T'\)\[0\]|slice\(0,\s*10\))/;
  for (const file of files) assert.doesNotMatch(await read(file), bad, file);
});

test('habit streak logic uses scheduled local date keys rather than parsing YYYY-MM-DD as UTC', async () => {
  const source = await read('src/app/components/HabitsPage.tsx');
  const start = source.indexOf('function calcStreak');
  const end = source.indexOf('function calcLongestStreak', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.doesNotMatch(block, /new Date\s*\(/);
  assert.match(block, /scheduledDatesBack/);
});

test('Edge Function covers cloud routes used by data screens, including journal delete and finance', async () => {
  const server = await read('supabase/functions/server/index.tsx');
  for (const pattern of [
    /app\.delete\(`\$\{PREFIX\}\/journal\/:date`/,
    /app\.get\(`\$\{PREFIX\}\/habitCategories`/,
    /app\.post\(`\$\{PREFIX\}\/transactions`/,
    /collectionRoutes\('accounts'\)/,
    /collectionRoutes\('budgets'\)/,
    /collectionRoutes\('savingsGoals'\)/,
    /app\.put\(`\$\{PREFIX\}\/financeSettings`/,
    /app\.put\(`\$\{PREFIX\}\/documents\/:id`/,
  ]) assert.match(server, pattern);
});

test('KV table and document bucket names match between migration and Edge Function', async () => {
  const migration = await read('supabase/migrations/20260101000000_create_kv_store.sql');
  const kv = await read('supabase/functions/server/kv_store.tsx');
  const server = await read('supabase/functions/server/index.tsx');
  assert.match(migration, /kv_store_3df25961/);
  assert.match(kv, /kv_store_3df25961/);
  assert.match(migration, /make-3df25961-docs/);
  assert.match(server, /const BUCKET = "make-3df25961-docs"/);
  assert.match(migration, /FOR UPDATE TO authenticated/);
  assert.match(migration, /GRANT ALL ON public\.kv_store_3df25961 TO service_role/);
});

test('obsolete pasted habits merge file is gone', async () => {
  await assert.rejects(access('src/imports/pasted_text/habits.tsx'));
});
