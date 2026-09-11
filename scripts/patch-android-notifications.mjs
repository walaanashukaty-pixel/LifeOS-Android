import fs from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (!fs.existsSync(manifestPath)) {
  console.error(`Missing ${manifestPath}`);
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');
const permissions = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
];

for (const permission of permissions) {
  const tag = `<uses-permission android:name="${permission}" />`;
  if (!manifest.includes(permission)) {
    manifest = manifest.replace(/(<manifest\b[^>]*>)/, `$1\n    ${tag}`);
  }
}

fs.writeFileSync(manifestPath, manifest);
console.log('Android notification permissions are present.');
