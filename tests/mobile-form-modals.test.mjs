import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('FormModal provides a mobile-only portal dialog shell', () => {
  const path = new URL('../src/app/components/ui/FormModal.tsx', import.meta.url);
  assert.equal(existsSync(path), true, 'FormModal.tsx should exist');
  const src = read('src/app/components/ui/FormModal.tsx');
  assert.match(src, /createPortal/);
  assert.match(src, /useIsMobile/);
  assert.match(src, /role=["']dialog["']/);
  assert.match(src, /aria-modal/);
  assert.match(src, /Escape/);
  assert.match(src, /document\.body\.style\.overflow/);
  assert.match(src, /100dvh/);
  assert.match(src, /safe-area-inset-top/);
  assert.match(src, /onClick=\{onClose\}/);
  assert.match(src, /if \(!isMobile\)/);
});

for (const page of ['TasksPage', 'GoalsPage', 'EventsPage', 'SkillsPage', 'AgreementsPage']) {
  test(`${page} routes its add/edit form through FormModal`, () => {
    const src = read(`src/app/components/${page}.tsx`);
    assert.match(src, /FormModal/);
    assert.match(src, /<FormModal[\s\S]*open=\{showForm\}/);
  });
}

test('Tasks form opening no longer scrolls the page to the inline form', () => {
  const src = read('src/app/components/TasksPage.tsx');
  assert.doesNotMatch(src, /formRef/);
  assert.doesNotMatch(src, /scrollIntoView\(\{ behavior: 'smooth', block: 'start'/);
  assert.doesNotMatch(src, /setShowForm\(s => !s\); setTimeout/);
});

const multiFormPages = [
  ['HabitsPage', ['showForm']],
  ['LanguagesPage', ['showLangForm', 'showItemForm']],
  ['StudyPage', ['showForm', 'showSessionForm', 'showLessonForm', 'showExamForm']],
  ['FitnessPage', ['showForm', 'showWeightForm']],
];

for (const [page, states] of multiFormPages) {
  test(`${page} routes all supported mobile forms through FormModal`, () => {
    const src = read(`src/app/components/${page}.tsx`);
    assert.match(src, /FormModal/);
    for (const state of states) {
      assert.match(src, new RegExp(`<FormModal[^>]*open=\\{${state}\\}`), `${page} should wrap ${state}`);
    }
  });
}

test('Finance inline creation forms use FormModal while existing finance overlays remain available', () => {
  const src = read('src/app/components/FinancePage.tsx');
  assert.match(src, /FormModal/);
  for (const state of ['showAccForm', 'showBudForm', 'showSavForm']) {
    assert.match(src, new RegExp(`<FormModal[^>]*open=\\{${state}\\}`), `Finance should wrap ${state}`);
  }
  assert.match(src, /showTxnForm &&/);
  assert.match(src, /showTransfer &&/);
  assert.match(src, /showSettings &&/);
});

test('Religious add forms use FormModal only for presentation and add no monetization hooks', () => {
  const src = read('src/app/components/ReligiousPage.tsx');
  assert.match(src, /FormModal/);
  for (const state of ['showDhikrForm', 'showQuranForm', 'showMemForm', 'showLessonForm']) {
    assert.match(src, new RegExp(`<FormModal[^>]*open=\\{${state}\\}`), `Religious should wrap ${state}`);
  }
  assert.doesNotMatch(src, /useMonetization|guardCreation|RewardGateDialog|utils\/ads/);
});

test('mobile form modal collapses dense form grids without changing desktop styles', () => {
  const modal = read('src/app/components/ui/FormModal.tsx');
  const theme = read('src/styles/theme.css');
  assert.match(modal, /lifeos-mobile-form-modal/);
  assert.match(theme, /@media \(max-width: 767px\)/);
  assert.match(theme, /\.lifeos-mobile-form-modal \.grid-cols-2/);
  assert.match(theme, /\.lifeos-mobile-form-modal \.grid-cols-3/);
  assert.match(theme, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test('reward and Pro overlays stay above the mobile form modal', () => {
  const formModal = read('src/app/components/ui/FormModal.tsx');
  const rewardGate = read('src/app/components/RewardGateDialog.tsx');
  const proPaywall = read('src/app/components/ProPaywall.tsx');

  const layer = (src, label) => {
    const match = src.match(/fixed inset-0 z-\[(\d+)\]/);
    assert.ok(match, `${label} should define an explicit fixed overlay z-index`);
    return Number(match[1]);
  };

  const formLayer = layer(formModal, 'FormModal');
  assert.ok(layer(rewardGate, 'RewardGateDialog') > formLayer, 'reward warning must render above an open mobile form');
  assert.ok(layer(proPaywall, 'ProPaywall') > formLayer, 'Pro paywall must render above an open mobile form');
});

test('Android text inputs explicitly bridge focus to the native keyboard', () => {
  const keyboard = read('src/utils/keyboard.ts');
  const pkg = JSON.parse(read('package.json'));
  const config = read('capacitor.config.ts');
  assert.equal(pkg.dependencies['@capacitor/keyboard'], '8.0.5');
  assert.match(keyboard, /Keyboard\.show\(\)/);
  assert.match(keyboard, /lifeos:keyboard-visibility/);
  assert.match(config, /resizeOnFullScreen:\s*true/);
});

test('mobile form sheet prioritizes editable focus and does not drag from input touches', () => {
  const modal = read('src/app/components/ui/FormModal.tsx');
  assert.match(modal, /input\[autofocus\]/);
  assert.match(modal, /const editable/);
  assert.doesNotMatch(modal, /drag=\{/);
});

test('shared mobile layout has a bounded scroll viewport and keyboard-aware bottom navigation', () => {
  const layout = read('src/app/components/Layout.tsx');
  const theme = read('src/styles/theme.css');
  assert.match(layout, /min-h-0 min-w-0 flex-1 flex-col/);
  assert.match(layout, /lifeos:keyboard-visibility/);
  assert.match(layout, /lifeos-main lifeos-scroll-region min-h-0 flex-1 overflow-y-auto/);
  assert.match(theme, /\.lifeos-app-shell\s*\{[\s\S]*height:\s*100dvh/);
  assert.match(theme, /\.lifeos-main\s*\{[\s\S]*touch-action:\s*pan-y/);
});

test('task creation sheet has only the shared modal close control in its form header', () => {
  const tasks = read('src/app/components/TasksPage.tsx');
  const start = tasks.indexOf('{showForm && (');
  const end = tasks.indexOf('{/* ── Search & Filters', start);
  const block = tasks.slice(start, end);
  assert.match(block, /<FormModal/);
  assert.match(block, /data-autofocus/);
  assert.doesNotMatch(block, /<button onClick=\{resetForm\}[\s\S]{0,180}<X size=\{16\}/);
});
