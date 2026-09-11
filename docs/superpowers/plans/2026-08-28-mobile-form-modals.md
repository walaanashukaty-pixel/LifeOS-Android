# LifeOS Mobile Form Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show LifeOS add/edit forms in a separate popup on phones while leaving tablet and desktop form presentation unchanged.

**Architecture:** Add one `FormModal` presentation component that uses `useIsMobile()` and a React portal only below 768px. On tablet/desktop it returns the existing form JSX unchanged. Existing page state, validation, save handlers, reward gates, API calls, and form markup remain intact; each existing conditional form block is only wrapped by `FormModal`.

**Tech Stack:** React 18, TypeScript, ReactDOM portal, Tailwind CSS, existing `useIsMobile()` hook, Node structural tests.

**Spec:** `docs/superpowers/specs/2026-08-28-unified-form-modal-design.md`

## Global Constraints

- Mobile means viewport width below 768px, matching `src/app/components/ui/use-mobile.ts`.
- Tablet and desktop must keep current add/edit rendering behavior.
- Do not change data models, API endpoints, save logic, validation, reward/ad limits, or Pro logic.
- Religious add forms remain free and must not gain monetization hooks.
- Journal and Future Vision remain page-level editors.
- Native document file picker remains native.
- Existing successful save handlers continue closing their current `show*Form` state.

---

### Task 1: Shared mobile-only FormModal shell

**Files:**
- Create: `src/app/components/ui/FormModal.tsx`
- Create: `tests/mobile-form-modals.test.mjs`

**Interfaces:**
- Consumes: `useIsMobile(): boolean` from `src/app/components/ui/use-mobile.ts`.
- Produces: `FormModal({ open, title, onClose, children, panelClassName? })`.

- [ ] **Step 1: Write the failing structural test**

Create a Node test that asserts `FormModal.tsx` contains `createPortal`, `useIsMobile`, `role="dialog"`, `aria-modal`, Escape handling, backdrop close handling, `document.body.style.overflow`, `100dvh`, and safe-area-aware sizing.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/mobile-form-modals.test.mjs`
Expected: FAIL because `src/app/components/ui/FormModal.tsx` does not exist.

- [ ] **Step 3: Implement FormModal**

Implement a component that returns `children` unchanged when `open` is false or when `useIsMobile()` is false; when mobile and open, portal a fixed overlay into `document.body`, use a backdrop button/div to call `onClose`, stop panel click propagation, listen for `Escape`, lock and restore body overflow, render an accessible hidden title plus a visible close button, and constrain the panel to `calc(100vw - 24px)` and safe-area-aware `100dvh` max height with internal scrolling.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test tests/mobile-form-modals.test.mjs`
Expected: PASS.

### Task 2: Migrate primary add/edit pages

**Files:**
- Modify: `src/app/components/TasksPage.tsx`
- Modify: `src/app/components/GoalsPage.tsx`
- Modify: `src/app/components/EventsPage.tsx`
- Modify: `src/app/components/SkillsPage.tsx`
- Modify: `src/app/components/AgreementsPage.tsx`
- Test: `tests/mobile-form-modals.test.mjs`

**Interfaces:**
- Consumes: `FormModal` from Task 1.
- Produces: mobile modal presentation around each page's existing `showForm` block.

- [ ] **Step 1: Add failing page assertions**

Assert all five files import/use `FormModal`, and assert `TasksPage.tsx` no longer contains `scrollIntoView` for opening the add form.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/mobile-form-modals.test.mjs`
Expected: FAIL on the page assertions.

- [ ] **Step 3: Wrap existing conditional form JSX**

Wrap each `showForm` form with `FormModal open={showForm} title={...} onClose={...}` while keeping the current form card JSX inside it. For Tasks, remove only the `setTimeout(...scrollIntoView...)` behavior; retain form state reset and opening behavior.

- [ ] **Step 4: Run test and verify GREEN**

Run: `node --test tests/mobile-form-modals.test.mjs`
Expected: PASS.

### Task 3: Migrate multi-form productivity pages

**Files:**
- Modify: `src/app/components/HabitsPage.tsx`
- Modify: `src/app/components/LanguagesPage.tsx`
- Modify: `src/app/components/StudyPage.tsx`
- Modify: `src/app/components/FitnessPage.tsx`
- Test: `tests/mobile-form-modals.test.mjs`

**Interfaces:**
- Consumes: `FormModal` from Task 1.
- Produces: mobile modal presentation for habit/category, language/item, subject/session/lesson/exam, workout/weight forms.

- [ ] **Step 1: Add failing assertions for every form state**

Assert the files use `FormModal` and include the corresponding state names (`showForm`, `showCatForm`, `showLangForm`, `showItemForm`, `showSessionForm`, `showLessonForm`, `showExamForm`, `showWeightForm`) near FormModal usage.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/mobile-form-modals.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Wrap each existing form block**

Keep each existing form component/body unchanged and use the existing state close/reset callbacks for `onClose`.

- [ ] **Step 4: Run test and verify GREEN**

Run: `node --test tests/mobile-form-modals.test.mjs`
Expected: PASS.

### Task 4: Migrate Finance and Religious forms

**Files:**
- Modify: `src/app/components/FinancePage.tsx`
- Modify: `src/app/components/ReligiousPage.tsx`
- Test: `tests/mobile-form-modals.test.mjs`

**Interfaces:**
- Consumes: `FormModal` from Task 1.
- Produces: mobile modal presentation for finance transaction/account/budget/savings/transfer/settings and religious dhikr/quran/memorization/lesson forms.

- [ ] **Step 1: Add failing assertions**

Assert Finance uses FormModal for `showTxnForm`, `showAccForm`, `showBudForm`, `showSavForm`, `showTransfer`, and `showSettings`; assert Religious uses it for all four add form states and does not import `RewardGateDialog`, `guardCreation`, or ads utilities as part of this change.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/mobile-form-modals.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Wrap finance/religious forms**

Finance's already-overlay transaction/transfer/settings forms must still render unchanged on desktop by moving their current panel content into `FormModal`; on mobile the shared shell provides the overlay. Keep reward gates and save logic untouched. Religious forms only change presentation.

- [ ] **Step 4: Run test and verify GREEN**

Run: `node --test tests/mobile-form-modals.test.mjs`
Expected: PASS.

### Task 5: Regression verification and deliverable

**Files:**
- Modify only if tests expose a regression.
- Create final ZIP from `/mnt/data/lifeos_modal_work` after verification.

**Interfaces:**
- Consumes: all migrated pages.
- Produces: verified project ZIP suitable for GitHub Actions Android build.

- [ ] **Step 1: Run modal tests**

Run: `node --test tests/mobile-form-modals.test.mjs`
Expected: all tests PASS.

- [ ] **Step 2: Run existing monetization tests**

Run: `npm run test:ads`
Expected: all tests PASS.

- [ ] **Step 3: Run auth/subscription tests**

Run: `npm run test:auth`
Expected: all tests PASS.

- [ ] **Step 4: Run mobile notification tests**

Run: `npm run test:mobile`
Expected: all tests PASS.

- [ ] **Step 5: Run TypeScript syntax/transpile verification**

Run a TypeScript/TSX parse/transpile check across `src/**/*.ts` and `src/**/*.tsx` using the installed TypeScript compiler API if dependencies are present; otherwise rely on GitHub Actions production build as the final compiler gate and report that limitation explicitly.

- [ ] **Step 6: Create delivery archive**

Create `/mnt/data/LifeOS-Mobile-Form-Popup-v1.zip` excluding `node_modules`, `.git`, `.env*`, keystores, and generated build directories.
