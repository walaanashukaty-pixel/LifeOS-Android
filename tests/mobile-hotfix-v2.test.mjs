import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('mobile form keyboard focus is stable across controlled-input rerenders', async () => {
  const modal = await read('src/app/components/ui/FormModal.tsx');
  assert.match(modal, /const onCloseRef = React\.useRef\(onClose\)/);
  assert.match(modal, /onCloseRef\.current = onClose/);
  assert.match(modal, /\}, \[open, isMobile\]\);/);
  assert.doesNotMatch(modal, /\}, \[open, isMobile, onClose\]\);/);
  assert.match(modal, /Do not auto-focus the first input on Android/);
});

test('Android build forces adjustResize so IME does not overlay focused fields', async () => {
  const patch = await read('scripts/patch-android-auth-deeplink.mjs');
  assert.match(patch, /android:windowSoftInputMode="adjustResize"/);
});

test('mobile top bar is compact and safe-area inset is capped', async () => {
  const css = await read('src/styles/theme.css');
  assert.match(css, /height: calc\(44px \+ min\(env\(safe-area-inset-top, 0px\), 24px\)\) !important/);
  assert.match(css, /padding-top: min\(env\(safe-area-inset-top, 0px\), 24px\)/);
});

test('Goals disables shared layout calculations on mobile', async () => {
  const goals = await read('src/app/components/GoalsPage.tsx');
  assert.match(goals, /const isMobile = useIsMobile\(\)/);
  assert.match(goals, /if \(isMobile\) \{/);
  assert.match(goals, /<div key=\{goal\.id\} className=\{`lifeos-list-card/);
  assert.match(goals, /layoutId=\{`lifeos-goal-card-/);
  assert.match(goals, /useMemo\(\(\) =>/);
});

test('normal pushes have no separate web CI workflow/artifact', async () => {
  await assert.rejects(access('.github/workflows/ci.yml'));
  const mobile = await read('.github/workflows/main.yml');
  assert.match(mobile, /name: LifeOS Android Test APK/);
  assert.match(mobile, /Upload test APK artifact/);
  assert.doesNotMatch(mobile, /lifeos-web-dist/);
});
