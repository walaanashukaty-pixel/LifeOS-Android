import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflows = [
  '.github/workflows/main.yml',
  '.github/workflows/android-release.yml',
];

for (const workflow of workflows) {
  test(`${workflow} uses the current Android setup action without legacy tools`, async () => {
    const yaml = await readFile(workflow, 'utf8');

    assert.match(yaml, /android-actions\/setup-android@v4/);
    assert.doesNotMatch(yaml, /android-actions\/setup-android@v3/);
    assert.match(
      yaml,
      /uses:\s*android-actions\/setup-android@v4[\s\S]*?with:\s*\n[\s\S]*?packages:\s*''/,
    );

    // The exact packages LifeOS needs must be installed explicitly.
    assert.match(yaml, /sdkmanager\s+"platform-tools"\s+"platforms;android-36"\s+"build-tools;36\.0\.0"/);
  });

  test(`${workflow} no longer uses deprecated setup-java v4`, async () => {
    const yaml = await readFile(workflow, 'utf8');
    assert.match(yaml, /actions\/setup-java@v6/);
    assert.doesNotMatch(yaml, /actions\/setup-java@v4/);
  });
}
