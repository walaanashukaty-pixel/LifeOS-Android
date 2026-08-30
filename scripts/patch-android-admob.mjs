import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const demoAppId = 'ca-app-pub-3940256099942544~3347511713';
let xml;
try { xml = await readFile(manifestPath, 'utf8'); }
catch { throw new Error(`Missing ${manifestPath}. Run Capacitor Android setup first.`); }

const configured = String(process.env.ADMOB_ANDROID_APP_ID || '').trim();
const testMode = process.env.LIFEOS_ADMOB_TEST_MODE === 'true';
const allowDemo = process.env.CI !== 'true' || testMode;
const appId = testMode ? demoAppId : (configured || (allowDemo ? demoAppId : ''));
if (!appId) throw new Error('Missing ADMOB_ANDROID_APP_ID in CI. Use LIFEOS_ADMOB_TEST_MODE=true only for test builds.');

const key = 'com.google.android.gms.ads.APPLICATION_ID';
const metadataRe = new RegExp(`\\s*<meta-data\\s+android:name=["']${key.replaceAll('.', '\\.') }["'][\\s\\S]*?\\/>`, 'g');
xml = xml.replace(metadataRe, '');
const entry = `\n        <meta-data\n            android:name="${key}"\n            android:value="${appId}" />`;
if (!/<application\b/.test(xml)) throw new Error('AndroidManifest.xml has no <application>.');
xml = xml.replace(/(<application\b[^>]*>)/, `$1${entry}`);
await writeFile(manifestPath, xml);
console.log(`AdMob Android App ID configured (${appId === demoAppId ? 'demo' : 'production'}).`);
