const DEMO_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const DEMO_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

const testMode = process.env.LIFEOS_ADMOB_TEST_MODE === 'true';
const appId = String(process.env.ADMOB_ANDROID_APP_ID || '').trim();
const rewardedId = String(process.env.VITE_ADMOB_REWARDED_AD_UNIT_ID || '').trim();

const appIdPattern = /^ca-app-pub-\d{16}~\d{10}$/;
const rewardedIdPattern = /^ca-app-pub-\d{16}\/\d{10}$/;

if (testMode) {
  console.log(`AdMob config: test mode; effective IDs are Google demo IDs (${DEMO_APP_ID}, ${DEMO_REWARDED_ID}).`);
  process.exit(0);
}

if (!appId || !rewardedId) {
  throw new Error('Production AdMob mode requires both ADMOB_ANDROID_APP_ID and VITE_ADMOB_REWARDED_AD_UNIT_ID.');
}

if (!appIdPattern.test(appId)) {
  throw new Error('ADMOB_ANDROID_APP_ID has an invalid Android AdMob App ID format.');
}

if (!rewardedIdPattern.test(rewardedId)) {
  throw new Error('VITE_ADMOB_REWARDED_AD_UNIT_ID has an invalid Rewarded Ad Unit ID format.');
}

if (appId === DEMO_APP_ID || rewardedId === DEMO_REWARDED_ID) {
  throw new Error('Refusing mixed/demo AdMob identifiers in production mode. Use both real production IDs or enable LIFEOS_ADMOB_TEST_MODE.');
}

console.log('AdMob config: production identifiers are present and not Google demo IDs.');
