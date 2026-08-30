import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages = {
  TasksPage: 'tasks',
  HabitsPage: 'habits',
  GoalsPage: 'goals',
  EventsPage: 'events',
  SkillsPage: 'skills',
  AgreementsPage: 'agreements',
  DocumentVaultPage: 'documents',
};

for (const [page, rewardKey] of Object.entries(pages)) {
  test(`${page} gates only its approved creation capacity`, async () => {
    const source = await readFile(`src/app/components/${page}.tsx`, 'utf8');
    assert.match(source, /useMonetization/);
    assert.match(source, new RegExp(`guardCreation\\(\\{\\s*key:\\s*['\"]${rewardKey}['\"]`));
  });
}

test('religious page never imports or calls monetization ads', async () => {
  const source = await readFile('src/app/components/ReligiousPage.tsx', 'utf8');
  assert.doesNotMatch(source, /useMonetization|guardCreation|showRewardedAd|AdMob/);
});

test('languages gate profiles and combined nested language content with timestamps', async () => {
  const source = await readFile('src/app/components/LanguagesPage.tsx', 'utf8');
  assert.match(source, /key:\s*['"]languages['"]/);
  assert.match(source, /key:\s*['"]language_content['"]/);
  assert.match(source, /createdAt:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(source, /countCreatedOnDate/);
});

test('study gates subjects and lessons but not sessions or exams', async () => {
  const source = await readFile('src/app/components/StudyPage.tsx', 'utf8');
  assert.match(source, /key:\s*['"]study_subjects['"]/);
  assert.match(source, /key:\s*['"]study_lessons['"]/);
  assert.match(source, /createdAt:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(source, /countCreatedOnDate/);

  const sessionStart = source.indexOf('async function addSession');
  const examStart = source.indexOf('async function addExam');
  if (sessionStart >= 0) {
    const next = source.indexOf('\n  async function ', sessionStart + 10);
    assert.doesNotMatch(source.slice(sessionStart, next >= 0 ? next : source.length), /guardCreation/);
  }
  if (examStart >= 0) {
    const next = source.indexOf('\n  async function ', examStart + 10);
    assert.doesNotMatch(source.slice(examStart, next >= 0 ? next : source.length), /guardCreation/);
  }
});

test('finance gates setup capacities while transaction save stays unlimited', async () => {
  const source = await readFile('src/app/components/FinancePage.tsx', 'utf8');
  for (const key of ['finance_accounts', 'finance_budgets', 'savings_goals']) {
    assert.match(source, new RegExp(`key:\\s*['\"]${key}['\"]`));
  }
  const txnStart = source.indexOf('async function saveTxn');
  const txnEnd = source.indexOf('\n  async function ', txnStart + 10);
  assert.ok(txnStart >= 0);
  assert.doesNotMatch(source.slice(txnStart, txnEnd >= 0 ? txnEnd : source.length), /guardCreation/);
});


test('capacity gates count only items that consume an approved slot', async () => {
  const goals = await readFile('src/app/components/GoalsPage.tsx', 'utf8');
  assert.match(goals, /Number\(form\.progress\s*\?\?\s*0\)\s*<\s*100[\s\S]{0,220}guardCreation\(\{\s*key:\s*['"]goals['"]/);

  const events = await readFile('src/app/components/EventsPage.tsx', 'utf8');
  assert.match(events, /localDateKey/);
  assert.match(events, /form\.date\s*>=\s*currentToday[\s\S]{0,260}guardCreation\(\{\s*key:\s*['"]events['"]/);

  const agreements = await readFile('src/app/components/AgreementsPage.tsx', 'utf8');
  assert.match(agreements, /form\.status\s*===\s*['"]active['"]\s*\|\|\s*form\.status\s*===\s*['"]overdue['"][\s\S]{0,260}guardCreation\(\{\s*key:\s*['"]agreements['"]/);
});
