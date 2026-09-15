import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('UIUX V3 adds secondary-experience surfaces and universal loading states', async () => {
  const theme = await read('src/styles/theme.css');
  const primitives = await read('src/app/components/ui/LifeOSPrimitives.tsx');
  assert.match(theme, /UI\/UX V3/);
  assert.match(theme, /\.lifeos-v3-learning-layout/);
  assert.match(theme, /\.lifeos-v3-upload-zone/);
  assert.match(theme, /\.lifeos-v3-spiritual-tabs/);
  assert.match(theme, /\.lifeos-v3-skeleton/);
  assert.match(primitives, /export function LoadingPage/);
  assert.match(primitives, /export function SummaryCard/);
});

test('study, skills and languages share the learning hierarchy without losing creation quotas', async () => {
  const study = await read('src/app/components/StudyPage.tsx');
  const skills = await read('src/app/components/SkillsPage.tsx');
  const languages = await read('src/app/components/LanguagesPage.tsx');
  for (const source of [study, skills, languages]) {
    assert.match(source, /<PageHero/);
    assert.match(source, /<LoadingPage/);
    assert.match(source, /<SummaryCard/);
  }
  assert.match(study, /lifeos-v3-learning-layout/);
  assert.match(study, /rewardKey="study_subjects"/);
  assert.match(skills, /rewardKey="skills"/);
  assert.match(languages, /lifeos-v3-learning-layout/);
  assert.match(languages, /rewardKey="languages"/);
});

test('fitness presents a pulse summary and guided empty workout state while preserving workout and weight APIs', async () => {
  const source = await read('src/app/components/FitnessPage.tsx');
  assert.match(source, /eyebrow="FITNESS PULSE"/);
  assert.match(source, /monthWorkouts/);
  assert.match(source, /latestWeight/);
  assert.match(source, /<AnimatedEmptyState icon={Dumbbell}/);
  assert.match(source, /api\('\/workouts'/);
  assert.match(source, /api\('\/weight'/);
});

test('journal uses a reflection hierarchy, completion summary and persistent archive', async () => {
  const source = await read('src/app/components/JournalPage.tsx');
  assert.match(source, /eyebrow="DAILY REFLECTION"/);
  assert.match(source, /journalStreak/);
  assert.match(source, /answeredNow/);
  assert.match(source, /lifeos-v3-journal-prompt/);
  assert.match(source, /title="الأرشيف"/);
  assert.match(source, /api\('\/journal'/);
});

test('document vault exposes storage context, guided upload and search-aware empty state', async () => {
  const source = await read('src/app/components/DocumentVaultPage.tsx');
  assert.match(source, /eyebrow="PRIVATE VAULT"/);
  assert.match(source, /totalBytes/);
  assert.match(source, /lifeos-v3-upload-zone/);
  assert.match(source, /lifeos-v3-document-card/);
  assert.match(source, /لا توجد نتائج مطابقة/);
  assert.match(source, /apiUpload\('\/documents'/);
});

test('spiritual progress gets a calm overview and retains all four functional tabs', async () => {
  const source = await read('src/app/components/ReligiousPage.tsx');
  assert.match(source, /eyebrow="SPIRITUAL RHYTHM"/);
  assert.match(source, /lifeos-v3-spiritual-tabs/);
  assert.match(source, /completedDhikr/);
  assert.match(source, /averageMemorization/);
  for (const id of ['dhikr', 'quran', 'memorization', 'lessons']) assert.match(source, new RegExp(`id: '${id}'`));
});

test('notification center summarizes immediate and upcoming attention without changing deep-link behavior', async () => {
  const source = await read('src/app/components/NotificationCenter.tsx');
  assert.match(source, /تحتاج انتباهك الآن/);
  assert.match(source, /قادمة قريبًا/);
  assert.match(source, /setNotificationDeepLinkTarget/);
  assert.match(source, /markNotificationRead/);
});
