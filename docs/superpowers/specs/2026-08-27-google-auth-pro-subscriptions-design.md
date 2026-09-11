# LifeOS Google Auth + Pro Subscriptions Design

## Goal
Add professional Google sign-in and a Free/Pro subscription foundation to the existing LifeOS Capacitor Android app without redesigning existing screens or replacing Supabase authentication.

## Constraints
- Keep email/password authentication working exactly as it does today.
- Keep `com.lifeos.app` as the Android app id.
- Keep Supabase as the authentication authority.
- Do not move existing LifeOS feature data during this change; current application data remains in localStorage.
- Google Play-distributed digital subscriptions use Google Play Billing, not PayPal in-app.
- The Supabase user UUID is the canonical user identity and is reused as RevenueCat `appUserID`.
- Missing billing configuration must fail closed as Free, never accidentally unlock Pro.

## Google Sign-In Architecture
- Use Supabase `signInWithOAuth({ provider: 'google' })`.
- Use PKCE for the Supabase JS client.
- Native Android launches the OAuth URL in the Capacitor Browser plugin.
- OAuth redirects to `com.lifeos.app://auth/callback`.
- Supabase automatic identity linking keeps a verified existing email/password user and a Google identity with the same email under one Supabase user where eligible, preserving the canonical UUID.
- Capacitor App receives the deep link and exchanges the returned authorization code with `supabase.auth.exchangeCodeForSession()`.
- Supabase auth-state events update the React user state, so Google and email/password logins enter the same LifeOS session path.
- Browser/web mode keeps the normal Supabase OAuth redirect flow.

## Subscription Architecture
- Use `@revenuecat/purchases-capacitor` as the Google Play Billing integration layer.
- RevenueCat entitlement identifier: `pro`.
- RevenueCat Android public SDK key comes from `VITE_REVENUECAT_ANDROID_API_KEY`.
- Initialize RevenueCat only on a native Android build and only after a Supabase user exists.
- Pass `user.id` to RevenueCat as `appUserID` so purchases remain bound to the same logical LifeOS account.
- Subscription status is derived from RevenueCat CustomerInfo entitlement `pro`.
- The app exposes a small internal `SubscriptionState`: Free / Pro / unavailable.
- Purchase options come from RevenueCat's current Offering; no Google Play product IDs are hard-coded in UI code.
- Restore purchases is available from the account screen.

## UX
### Authentication
- Keep the existing email/password form and tabs.
- Add a visual separator and a full-width "المتابعة باستخدام Google" button.
- The Google button uses the current LifeOS card, spacing, radius, typography, RTL direction, and loading behavior.
- OAuth cancellation returns the user to the login screen without creating a partial session.

### Account / Plan
- Add a compact plan card to AccountPage.
- Free shows `LifeOS Free`; active entitlement shows `LifeOS Pro`.
- Free users see `الترقية إلى Pro`.
- Pro users see status and a restore/manage affordance where technically available.
- No existing notification settings or account controls are removed.

### Paywall
- Add a LifeOS-styled modal/sheet component.
- Packages render from RevenueCat Offering data using store-localized price strings.
- Primary CTA purchases the selected package.
- Secondary action restores purchases.
- Billing-unavailable states clearly explain that Play subscription setup is not configured yet.

## Android Deep Link
After Capacitor creates the Android wrapper, patch `AndroidManifest.xml` with an intent filter for:
- scheme: `com.lifeos.app`
- host: `auth`
- pathPrefix: `/callback`

The existing GitHub Actions workflow applies this patch after `npx cap sync android`. The patch also changes MainActivity launchMode to `singleTop`, which is compatible with returning from external payment verification during Google Play purchases.

## External Dashboard Configuration Required
Code can be completed without secrets, but live Google/paid checkout requires:
1. Google OAuth Web Client configured in Google Cloud.
2. Google provider enabled in Supabase with that Client ID/Secret.
3. `com.lifeos.app://auth/callback` added to Supabase redirect URLs.
4. Google Play subscription products/base plans created after the app exists in Play Console.
5. RevenueCat project linked to the Play app, entitlement `pro` and current Offering configured.
6. GitHub/Vite build receives `VITE_REVENUECAT_ANDROID_API_KEY`.

## Security
- Never embed Google Client Secret or RevenueCat secret API keys in the app.
- Supabase anon/publishable key remains acceptable for the client.
- RevenueCat public Android SDK key is client-safe; secret REST keys are not bundled.
- Pro access fails closed when billing cannot be verified.

## Testing
- Pure tests cover OAuth callback parsing, native redirect recognition, and entitlement mapping.
- Existing mobile notification tests continue to pass.
- Vite build is run when dependencies are available.
- Android APK build remains in GitHub Actions, where Android SDK is available.
