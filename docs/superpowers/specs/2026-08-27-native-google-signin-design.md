# LifeOS Native Google Sign-In on Android — Design

Date: 2026-08-27

## Goal

Replace the current browser-based Google OAuth flow on Android with a native Android Google account chooser, while keeping Supabase as the single authentication system and keeping email/password login intact.

## User experience

On Android:
1. User taps "المتابعة باستخدام Google".
2. Android shows the Google account chooser directly.
3. User chooses an account.
4. LifeOS receives a Google ID token.
5. LifeOS sends that ID token to Supabase Auth.
6. Supabase creates or signs in the same user and returns the normal Supabase session.
7. LifeOS continues using the existing Supabase `user.id` for app identity and subscriptions.

On web:
- Keep the existing Supabase Google OAuth redirect flow.

## Architecture

### 1. Native Google authentication adapter

Add a small Android-only authentication module responsible for:
- opening the native Google account chooser,
- obtaining a Google ID token,
- returning that token to the TypeScript auth layer,
- returning clear cancellation/error states.

The rest of the application will not depend on Android-specific details.

### 2. Supabase session creation

The TypeScript auth layer will call Supabase `signInWithIdToken` using:
- provider: `google`
- token: Google ID token returned by the native layer

The existing Supabase session persistence, auth state listener, logout flow, and `user.id` usage remain unchanged.

### 3. Android OAuth credentials

Google Cloud will contain:
- an Android OAuth client for package `com.lifeos.app` and the app signing certificate SHA-1,
- a Web OAuth client used as the server/client ID for Google ID tokens and Supabase verification.

The Web client here is only an OAuth identifier; it does not make LifeOS a web app.

## Signing key requirement

The Android OAuth client is tied to the package name and signing certificate SHA-1.

The current GitHub workflow builds `assembleDebug` on an ephemeral GitHub runner. We must not base the final Android OAuth setup on a throwaway debug certificate.

For a stable setup:
- production releases will use Google Play App Signing,
- the production Android OAuth client will use the SHA-1 of Google Play's app-signing certificate,
- for APK testing outside Play, use one stable test/release signing key rather than a new temporary debug key each build.

Signing secrets/private keys must not be committed to the repository.

## Existing behavior preserved

The change will not alter:
- email/password sign-in,
- existing Supabase users,
- app data behavior,
- LifeOS Free/Pro model,
- RevenueCat subscription identity,
- notification system,
- desktop UI.

## Error handling

Expected states:
- user cancels account chooser → no error toast unless useful; return to login screen,
- Google credential unavailable → show a short Arabic retry message,
- Supabase rejects token → show an authentication error and do not create a local fake session,
- offline/network error → keep user on login screen and allow retry.

## Testing

Add/adjust tests for:
- Android path chooses native Google sign-in rather than browser OAuth,
- web path keeps existing Supabase OAuth behavior,
- Google ID token is passed to Supabase with provider `google`,
- successful Supabase session is persisted,
- cancellation does not produce a broken session,
- email/password login remains unchanged.

Build verification:
- TypeScript tests,
- Vite build,
- Capacitor sync,
- Android Gradle build,
- signing/SHA-1 verification for the build being tested.

## Rollout order

1. Implement native Google sign-in adapter and Supabase ID-token exchange.
2. Create stable Android test signing setup for APK testing.
3. Create Google Android OAuth client with the matching SHA-1.
4. Test Google sign-in on the user's Android phone.
5. When Play Console is ready, add the Play App Signing SHA-1 as the production Android OAuth credential.
6. Continue with Google Play subscriptions / RevenueCat after authentication is verified.
