import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');

const activityPattern = /<activity\b[^>]*android:name="\.MainActivity"[^>]*>/m;
const activity = manifest.match(activityPattern)?.[0];
if (!activity) throw new Error('MainActivity was not found in AndroidManifest.xml');

let patched = activity;
if (/android:windowSoftInputMode=/.test(patched)) {
  patched = patched.replace(/android:windowSoftInputMode="[^"]*"/, 'android:windowSoftInputMode="adjustResize"');
} else {
  patched = patched.replace(/>$/, '\n            android:windowSoftInputMode="adjustResize">');
}

manifest = manifest.replace(activity, patched);
await writeFile(manifestPath, manifest);
console.log('Android keyboard mode set to adjustResize.');
