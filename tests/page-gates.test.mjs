import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages = {
  TasksPage: ['tasks', 'tasks.length'],
  HabitsPage: ['habits', 'habits.length'],
  GoalsPage: ['goals', 'goals.length'],
  EventsPage: ['events', 'events.length'],
  SkillsPage: ['skills', 'skills.length'],
  AgreementsPage: ['agreements', 'agreements.length'],
  DocumentVaultPage: ['documents', 'documents.length'],
};

for (const [page, [rewardKey, countExpr]] of Object.entries(pages)) {
  test(`${page} gates whole-list capacity and shows the user the current capacity`, async () => {
    const source = await readFile(`src/app/components/${page}.tsx`, 'utf8');
    assert.match(source, /useMonetization/);
    assert.match(source, new RegExp(`guardCreation\\(\\{\\s*key:\\s*['\"]${rewardKey}['\"]`));
    assert.ok(source.includes(`currentCount: ${countExpr}`));
    assert.match(source, new RegExp(`RewardCapacityBar[\\s\\S]{0,180}rewardKey=['\"]${rewardKey}['\"]`));
  });
}

test('religious page stays ad-free', async () => {
  const source = await readFile('src/app/components/ReligiousPage.tsx', 'utf8');
  assert.doesNotMatch(source, /useMonetization|guardCreation|showRewardedAd|AdMob/);
});

test('languages gate profile capacity and all nested content across every language', async () => {
  const source = await readFile('src/app/components/LanguagesPage.tsx', 'utf8');
  assert.match(source, /key:\s*['"]languages['"],\s*currentCount:\s*languages\.length/);
  assert.match(source, /const allContent = languages\.flatMap/);
  assert.match(source, /key:\s*['"]language_content['"],\s*currentCount:\s*allContent\.length/);
  assert.match(source, /RewardCapacityBar[\s\S]{0,220}rewardKey="language_content"/);
  assert.doesNotMatch(source, /countCreatedOnDate/);
});

test('study gates subjects and all lessons; sessions and exams remain unlimited', async () => {
  const source = await readFile('src/app/components/StudyPage.tsx', 'utf8');
  assert.match(source, /key:\s*['"]study_subjects['"],\s*currentCount:\s*subjects\.length/);
  assert.match(source, /const allLessons = subjects\.flatMap/);
  assert.match(source, /key:\s*['"]study_lessons['"],\s*currentCount:\s*allLessons\.length/);
  assert.doesNotMatch(source, /countCreatedOnDate/);

  for (const name of ['addSession', 'addExam']) {
    const start = source.indexOf(`async function ${name}`);
    const next = source.indexOf('\n  async function ', start + 10);
    assert.ok(start >= 0);
    assert.doesNotMatch(source.slice(start, next >= 0 ? next : source.length), /guardCreation/);
  }
});

test('finance gates whole setup lists while transactions stay unlimited', async () => {
  const source = await readFile('src/app/components/FinancePage.tsx', 'utf8');
  for (const [key, expr] of [
    ['finance_accounts', 'accounts.length'],
    ['finance_budgets', 'budgets.length'],
    ['savings_goals', 'savingsGoals.length'],
  ]) {
    assert.ok(source.includes(`key: '${key}', currentCount: ${expr}`));
    assert.match(source, new RegExp(`RewardCapacityBar[\\s\\S]{0,180}rewardKey="${key}"`));
  }
  const txnStart = source.indexOf('async function saveTxn');
  const txnEnd = source.indexOf('\n  async function ', txnStart + 10);
  assert.ok(txnStart >= 0);
  assert.doesNotMatch(source.slice(txnStart, txnEnd >= 0 ? txnEnd : source.length), /guardCreation/);
});
