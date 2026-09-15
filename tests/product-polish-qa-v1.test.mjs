import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('QA V1 gives the Android shell Arabic metadata, safe-area viewport and LifeOS identity', async () => {
  const html = await read('index.html');
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /name="theme-color" content="#10b981"/);
  assert.match(html, /<title>LifeOS — نظام إدارة حياتك<\/title>/);
});

test('QA V1 handles mobile keyboard overlap and offline state at the shared layout level', async () => {
  const layout = await read('src/app/components/Layout.tsx');
  assert.match(layout, /window\.visualViewport/);
  assert.match(layout, /data-keyboard-open=\{keyboardOpen\}/);
  assert.match(layout, /lifeos-bottom-nav/);
  assert.match(layout, /navigator\.onLine/);
  assert.match(layout, /أنت غير متصل بالإنترنت/);
  assert.match(layout, /aria-label="التنقل الرئيسي"/);
});

test('QA V1 prevents horizontal swipes from accidentally arming pull-to-refresh and announces refresh state', async () => {
  const pull = await read('src/app/components/ui/PullToRefresh.tsx');
  assert.match(pull, /deltaX/);
  assert.match(pull, /Math\.abs\(deltaX\).*Math\.abs\(deltaY\)/s);
  assert.match(pull, /event\.preventDefault\(\)/);
  assert.match(pull, /role="status" aria-live="polite"/);
});

test('QA V1 restores focus and traps keyboard navigation in mobile sheets', async () => {
  const modal = await read('src/app/components/ui/FormModal.tsx');
  const actions = await read('src/app/components/ui/QuickActionSheet.tsx');
  for (const source of [modal, actions]) {
    assert.match(source, /previousFocus/);
    assert.match(source, /event\.key === 'Escape'/);
    assert.match(source, /event\.key !== 'Tab'/);
    assert.match(source, /preventScroll: true/);
  }
  assert.match(actions, /aria-labelledby=\{titleId\}/);
});

test('QA V1 replaces white-screen crashes with a recoverable application error boundary', async () => {
  const main = await read('src/main.tsx');
  const boundary = await read('src/app/components/AppErrorBoundary.tsx');
  assert.match(main, /<AppErrorBoundary><App \/><\/AppErrorBoundary>/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /window\.location\.reload\(\)/);
  assert.match(boundary, /بياناتك المحفوظة ما انحذفت/);
});

test('QA V1 validates document uploads on both client and server and opens signed links safely', async () => {
  const page = await read('src/app/components/DocumentVaultPage.tsx');
  const server = await read('supabase/functions/server/index.tsx');
  assert.match(page, /MAX_DOCUMENT_BYTES = 20 \* 1024 \* 1024/);
  assert.match(page, /ALLOWED_DOCUMENT_EXTENSIONS/);
  assert.match(page, /noopener,noreferrer/);
  assert.match(server, /MAX_DOCUMENT_BYTES = 20 \* 1024 \* 1024/);
  assert.match(server, /Unsupported file type/);
  assert.match(server, /File exceeds 20 MB limit/);
});

test('QA V1 handles Supabase email-confirmation signup instead of opening an unauthenticated app session', async () => {
  const auth = await read('src/utils/auth.ts');
  const page = await read('src/app/components/AuthPage.tsx');
  assert.match(auth, /EmailConfirmationRequiredError/);
  assert.doesNotMatch(auth, /return signIn\(email, password\);/);
  assert.match(page, /err instanceof EmailConfirmationRequiredError/);
  assert.match(page, /setMode\('login'\)/);
  assert.match(page, /minLength=\{6\}/);
});

test('QA V1 hardens focus, touch targets, safe areas and reduced motion globally', async () => {
  const css = await read('src/styles/theme.css');
  assert.match(css, /\.lifeos-app-shell/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /\.lifeos-touch-target/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /animation-duration: 0\.01ms !important/);
  assert.match(css, /\.lifeos-icon-action/);
});
