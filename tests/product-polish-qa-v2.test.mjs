import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

async function componentSources() {
  const names = await readdir('src/app/components');
  const files = names.filter(name => name.endsWith('.tsx'));
  return Promise.all(files.map(name => read(`src/app/components/${name}`)));
}

test('QA V2 gives Android Back a LIFO surface stack, page history, and dashboard exit behavior', async () => {
  const layout = await read('src/app/components/Layout.tsx');
  const back = await read('src/utils/android-back.ts');
  assert.match(layout, /App as CapacitorApp/);
  assert.match(layout, /CapacitorApp\.addListener\('backButton'/);
  assert.match(layout, /dispatchAndroidBack\(\)/);
  assert.match(layout, /pageHistoryRef\.current\.pop\(\)/);
  assert.match(layout, /CapacitorApp\.exitApp\(\)/);
  assert.match(back, /handlers\.length - 1/);
  assert.match(back, /registerAndroidBackHandler/);
});

test('QA V2 shared sheets and premium overlays consume Android Back before page navigation', async () => {
  const modal = await read('src/app/components/ui/FormModal.tsx');
  const quick = await read('src/app/components/ui/QuickActionSheet.tsx');
  const notifications = await read('src/app/components/NotificationCenter.tsx');
  const paywall = await read('src/app/components/ProPaywall.tsx');
  const reward = await read('src/app/components/RewardGateDialog.tsx');
  for (const source of [modal, quick, notifications]) assert.match(source, /registerAndroidBackHandler/);
  assert.match(paywall, /useAndroidBackHandler\(open && !purchasing, onClose\)/);
  assert.match(reward, /useAndroidBackHandler\(open && !busy, onCancel\)/);
});

test('QA V2 replaces browser confirm with one accessible, back-aware confirmation system', async () => {
  const app = await read('src/app/App.tsx');
  const dialog = await read('src/app/components/ui/ConfirmDialog.tsx');
  assert.match(app, /<ConfirmDialogProvider>/);
  assert.match(dialog, /role="alertdialog"/);
  assert.match(dialog, /aria-describedby=\{descriptionId\}/);
  assert.match(dialog, /registerAndroidBackHandler/);
  assert.match(dialog, /data-confirm-cancel/);
  const sources = await componentSources();
  assert.doesNotMatch(sources.join('\n'), /\bconfirm\s*\(/);
});

test('QA V2 retries only safe read requests and times out slow requests without duplicating writes', async () => {
  const api = await read('src/utils/api.ts');
  assert.match(api, /REQUEST_TIMEOUT_MS = 18_000/);
  assert.match(api, /RETRYABLE_READ_STATUSES = new Set\(\[408, 502, 503, 504\]\)/);
  assert.match(api, /canRetryRead = retryNetwork && \(method === 'GET' \|\| method === 'HEAD'\)/);
  assert.match(api, /lifeos:network-activity/);
  assert.match(api, /canRetryRead && !status/);
  assert.match(api, /return rawAuthorizedRequest<T>\(path, options, session, retryAuth, false\)/);
  assert.doesNotMatch(api, /method === 'POST'.*retryNetwork/s);
});

test('QA V2 surfaces slow network state separately from full offline state', async () => {
  const layout = await read('src/app/components/Layout.tsx');
  assert.match(layout, /slowNetwork/);
  assert.match(layout, /lifeos:network-activity/);
  assert.match(layout, /6500/);
  assert.match(layout, /الاتصال بطيء/);
  assert.match(layout, /isOnline && slowNetwork/);
});

test('QA V2 centralizes deeper text, number, and date validation across core forms', async () => {
  const validation = await read('src/utils/validation.ts');
  assert.match(validation, /textValidation/);
  assert.match(validation, /numberValidation/);
  assert.match(validation, /dateOrderValidation/);
  const goals = await read('src/app/components/GoalsPage.tsx');
  const agreements = await read('src/app/components/AgreementsPage.tsx');
  const finance = await read('src/app/components/FinancePage.tsx');
  const tasks = await read('src/app/components/TasksPage.tsx');
  assert.match(goals, /numberValidation\(form\.progress/);
  assert.match(goals, /dateOrderValidation\(form\.startDate, form\.deadline/);
  assert.match(agreements, /dateOrderValidation\(form\.agreementDate, form\.dueDate/);
  assert.match(finance, /1_000_000_000_000/);
  assert.match(tasks, /textValidation\(form\.description, 'وصف المهمة', 4000, false\)/);
});

test('QA V2 hardens landscape, large-text touch sizing, and high-contrast focus', async () => {
  const css = await read('src/styles/theme.css');
  assert.match(css, /orientation: landscape/);
  assert.match(css, /\.lifeos-bottom-nav button[\s\S]*min-height: 48px/);
  assert.match(css, /\.lifeos-segmented-item[\s\S]*min-height: 44px/);
  assert.match(css, /prefers-contrast: more/);
  assert.match(css, /outline-width: 3px/);
});

test('QA V2 keeps destructive flows behind the unified confirmation surface', async () => {
  const files = ['GoalsPage.tsx', 'FinancePage.tsx', 'HabitsPage.tsx', 'LanguagesPage.tsx', 'StudyPage.tsx', 'DocumentVaultPage.tsx', 'JournalPage.tsx', 'SkillsPage.tsx', 'EventsPage.tsx', 'FitnessPage.tsx', 'ReligiousPage.tsx', 'AgreementsPage.tsx'];
  const sources = await Promise.all(files.map(name => read(`src/app/components/${name}`)));
  for (const source of sources) assert.match(source, /useConfirmDialog/);
  assert.match(sources.join('\n'), /حذف الوثيقة نهائيًا/);
  assert.match(sources.join('\n'), /حذف الحدث/);
  assert.match(sources.join('\n'), /حذف المعاملة/);
});
