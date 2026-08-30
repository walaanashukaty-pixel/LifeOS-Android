# LifeOS Unified Add/Edit Modal Design

## Goal
Improve the **mobile** add/edit experience across LifeOS by showing supported forms in a consistent modal popup, while preserving the current tablet/desktop behavior exactly as it is today.

## UX Principles
- On **mobile phones only**, every supported **Add** and **Edit** action opens a modal above the current page.
- On **tablet and desktop**, keep the existing add/edit experience unchanged; do not force the new modal pattern there.
- The current page remains visible behind a softly darkened backdrop.
- Existing field order, labels, validation, save behavior, monetization gates, and API calls remain unchanged unless required for modal behavior.
- Saving successfully closes the modal and leaves the user on the same page.
- Cancel, the close button, or tapping the backdrop closes the modal without saving.
- Opening a modal locks background scrolling; closing restores it.
- Long forms scroll **inside the modal**, not the page behind it.
- On phones the modal uses nearly the full viewport width with small safe margins and a maximum height that respects `100dvh` and safe areas.
- The modal uses the existing LifeOS colors, rounded corners, borders, typography, and button styles.

## Shared Component
Create `src/app/components/ui/FormModal.tsx` as the reusable **mobile-only** modal shell. Pages may render their existing desktop/tablet form layout unchanged and switch to `FormModal` only below the chosen mobile breakpoint.

Responsibilities:
- Render through a React portal into `document.body` so the modal is not constrained by page layout or parent overflow.
- Fixed full-screen overlay with a high z-index.
- Backdrop with `bg-black/45` and light blur.
- Mobile popup panel sized for the phone viewport.
- Header with title and close icon.
- Scrollable body area.
- Support `open`, `title`, `onClose`, `children`, and optional width class.
- Provide `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
- Close on Escape and backdrop click; clicks inside panel must not close it.
- Lock document body scrolling while open.

## Pages and Forms in Scope

### Tasks
- Add task.
- Edit task.
- Remove inline scroll-to-form behavior because the form is now overlay-based.

### Habits
- Add habit.
- Edit habit.
- Add/edit custom habit category.
- Existing habit detail and templates dialogs remain dialogs; their visual shell may stay as-is unless they need the shared modal for consistency.

### Goals
- Add goal.
- Edit goal.

### Events
- Add event.
- Edit event.

### Languages
- Add language.
- Add learning item (vocabulary / grammar / conversation) for the currently selected language.
- Existing item editing is included if the page currently exposes an edit action.

### Skills
- Add skill.
- Edit skill.

### Study
- Add/edit subject.
- Add study session.
- Add lesson.
- Add exam.

### Fitness
- Add workout.
- Add weight record.
- Any existing edit action for those records uses the same modal pattern.

### Finance
- Add/edit income or expense transaction.
- Add account.
- Add budget.
- Add/edit savings goal.
- Transfer form.
- Finance settings remain modal and should be migrated to the shared shell for consistency.

### Agreements
- Add agreement.
- Edit agreement.

### Religious Section
- Add dhikr.
- Add Quran recitation entry.
- Add memorization entry.
- Add lesson.
- This only changes form presentation. The religious section remains fully free and has no advertising or monetization gate.

### Document Vault
- Native file picker remains native and is not wrapped merely for appearance.
- If a metadata/confirmation form exists after picking a file, that form should use the shared modal.

### Journal and Future Vision
- Their primary editing experiences are not converted into popups merely because text is editable; they are page-level workspaces, not discrete "add item" forms.

## Form Behavior Preservation
- Existing validation messages and toasts stay unchanged.
- Existing `guardCreation` ad/reward limits execute exactly as before when the user saves a new item.
- Edit operations must never accidentally invoke a creation/ad gate.
- Existing successful save/reset functions continue to close their corresponding modal.
- Failed saves leave the modal open with entered values preserved.

## Responsive Design
### Mobile
- Overlay padding: approximately 12px, accounting for safe areas.
- Panel width: `calc(100vw - 24px)`.
- Panel max height: approximately `calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))`.
- Rounded corners remain visible; this is a popup, not a full-page route.
- Header stays visible while modal body scrolls.
- Form grids that are too dense on mobile collapse to one column where necessary.

### Tablet / Desktop
- Preserve the current LifeOS add/edit layout exactly as it works today.
- No new modal behavior is introduced for tablet/desktop as part of this change.

## Accessibility
- Dialog semantics (`role=dialog`, `aria-modal`).
- Close button has an Arabic accessible label.
- Escape closes the top-level form modal.
- Background scroll is locked while modal is open.
- Initial focus goes to the modal container or first usable field when practical; the implementation must not steal focus after the user starts typing.

## Testing
Add automated structural tests that verify:
1. Shared `FormModal` exists and contains portal/dialog/backdrop/body-scroll-lock behavior.
2. Target pages use `FormModal` for add/edit form states on mobile while preserving the existing tablet/desktop rendering path.
3. Tasks no longer call `scrollIntoView` to reach the form.
4. Religious page uses modals only for presentation and contains no monetization hook added by this change.
5. Existing ads, auth, and mobile tests still pass.
6. Production build succeeds in CI/GitHub Actions after all modal migrations.

## Non-Goals
- Redesigning field contents or changing data models.
- Changing API endpoints.
- Changing AdMob/Pro limits.
- Adding new edit capabilities where none currently exist, except minor refactoring necessary to reuse an existing form.
- Replacing native operating-system file pickers with a fake modal.

## Success Criteria
On a phone, a user can tap any supported Add/Edit action, complete the same form inside a clearly separate popup, save or cancel, and remain at the same underlying page position. On tablet/desktop, the current LifeOS behavior remains unchanged. Mobile inline forms no longer push page content down, long mobile forms scroll within the popup, and existing data/monetization behavior is unchanged.
