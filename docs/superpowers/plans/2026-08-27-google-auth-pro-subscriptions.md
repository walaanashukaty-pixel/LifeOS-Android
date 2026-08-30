# Google Auth + Pro Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Google login and a RevenueCat-backed Free/Pro subscription layer to the existing LifeOS Capacitor Android app.

**Architecture:** Keep Supabase as identity authority, use PKCE + Capacitor Browser/App deep links for Google OAuth, and use the Supabase UUID as RevenueCat appUserID. RevenueCat handles Google Play Billing verification and entitlement state, while the React UI consumes a small subscription service.

**Tech Stack:** React 18, TypeScript, Supabase JS, Capacitor 8, @capacitor/app, @capacitor/browser, RevenueCat Capacitor SDK, Vite, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-27-google-auth-pro-subscriptions-design.md`

## Global Constraints
- Existing email/password login remains functional.
- Android app id remains `com.lifeos.app`.
- Existing LifeOS data storage is not migrated in this change.
- RevenueCat entitlement identifier is exactly `pro`.
- Missing billing configuration resolves to Free/unavailable, never Pro.

---

### Task 1: OAuth callback model
**Files:**
- Create: `src/utils/oauth-model.ts`
- Create: `tests/auth-subscription.test.mjs`

**Interfaces:**
- Produces: `GOOGLE_AUTH_REDIRECT`, `parseAuthCallback(url)`, `isLifeOSAuthCallback(url)`.

- [ ] Write tests for correct callback parsing and rejection of unrelated URLs.
- [ ] Run tests and confirm they fail before implementation.
- [ ] Implement the pure URL parser.
- [ ] Run tests and confirm they pass.

### Task 2: Supabase Google OAuth bridge
**Files:**
- Modify: `src/utils/api.ts`
- Modify: `src/utils/auth.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/components/AuthPage.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `signInWithGoogle()`, `setupGoogleAuthDeepLinkListener()`.

- [ ] Configure Supabase auth for PKCE.
- [ ] Add Capacitor App/Browser dependencies.
- [ ] Implement native OAuth launch and callback exchange.
- [ ] Subscribe App state to Supabase SIGNED_IN/SIGNED_OUT changes.
- [ ] Add Google button to AuthPage while preserving existing form.
- [ ] Run auth tests.

### Task 3: Subscription state model
**Files:**
- Create: `src/utils/subscription-model.ts`
- Modify: `tests/auth-subscription.test.mjs`

**Interfaces:**
- Produces: `SubscriptionState`, `hasProEntitlement(customerInfo)`, `toSubscriptionState(customerInfo)`.

- [ ] Add failing entitlement mapping tests.
- [ ] Implement minimal pure entitlement mapping.
- [ ] Run tests and confirm pass.

### Task 4: RevenueCat service
**Files:**
- Create: `src/utils/subscriptions.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `configureSubscriptions(userId)`, `getSubscriptionState()`, `getSubscriptionPackages()`, `purchaseSubscriptionPackage(pkg)`, `restoreSubscriptionPurchases()`.

- [ ] Add RevenueCat dependency.
- [ ] Configure only on native platform with a public Android key.
- [ ] Use Supabase UUID as RevenueCat appUserID.
- [ ] Return closed Free/unavailable state when not configured.

### Task 5: Pro account UI and paywall
**Files:**
- Create: `src/app/components/ProPaywall.tsx`
- Modify: `src/app/components/AccountPage.tsx`

**Interfaces:**
- AccountPage initializes/refreshes subscription status and opens ProPaywall.

- [ ] Add plan card without removing current account/notification controls.
- [ ] Render current RevenueCat Offering packages using localized price strings.
- [ ] Purchase selected package and refresh plan state.
- [ ] Restore purchases and refresh plan state.

### Task 6: Android auth deep link build patch
**Files:**
- Create: `scripts/patch-android-auth-deeplink.mjs`
- Modify: `.github/workflows/main.yml`

**Interfaces:**
- Workflow runs patch after `npx cap sync android` and before Gradle build.

- [ ] Patch `AndroidManifest.xml` idempotently with custom auth callback intent filter.
- [ ] Add workflow step.
- [ ] Verify workflow YAML and patch script syntax.

### Task 7: Documentation and final verification
**Files:**
- Create: `GOOGLE_AUTH_AND_PRO_SETUP_AR.md`
- Modify: `README_MOBILE_AR.md`

- [ ] Document Google Cloud + Supabase redirect configuration.
- [ ] Document RevenueCat + Play Console setup and required public SDK key.
- [ ] Run `npm run test:mobile` and `npm run test:auth`.
- [ ] Run Vite build if dependencies are available.
- [ ] Package the completed project as a new ZIP.
