import fs from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (!fs.existsSync(manifestPath)) {
  console.error(`Missing ${manifestPath}`);
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

// RevenueCat recommends standard or singleTop so external payment verification
// can return to the same purchase flow without cancelling it.
manifest = manifest.replace(
  /android:launchMode="[^"]+"/,
  'android:launchMode="singleTop"',
);

if (!manifest.includes('android:scheme="com.lifeos.app"')) {
  const activityPattern = /(<activity\b[^>]*android:name="\.MainActivity"[^>]*>)([\s\S]*?)(<\/activity>)/;
  const match = manifest.match(activityPattern);
  if (!match) {
    console.error('Could not find MainActivity in AndroidManifest.xml');
    process.exit(1);
  }

  const authIntentFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="com.lifeos.app"
                    android:host="auth"
                    android:pathPrefix="/callback" />
            </intent-filter>`;

  manifest = manifest.replace(
    activityPattern,
    `${match[1]}${match[2]}${authIntentFilter}\n        ${match[3]}`,
  );
}

fs.writeFileSync(manifestPath, manifest);
console.log('LifeOS auth deep link and billing-safe launchMode are present.');
