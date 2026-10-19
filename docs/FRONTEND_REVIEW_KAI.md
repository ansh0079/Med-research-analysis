## Signal MD — Frontend Review for Kai (a11y/UX/interaction)

Audience: Kai (frontend). Scope: UI structure, React patterns, accessibility, and interaction bugs. No product UI edits in this PR — report only. Clinical copy risks from Uri’s review are cited and clearly separated from frontend issues.

### What I verified
- Code paths Uri flagged exist and render as described: `SynthesisClinicalActionCard`, `OnboardingModal`, `CompliancePage`, `LegalTermsPage`, `LandingPage`, `SearchPage`, `SearchBar`, `TopicBriefPanel`, `SynthesisPanel` (+ `synthesis/*`), conflict matrix, quiz/cases, shared primitives (modals/dialogs/toasts/forms/buttons), and app shell in `App.tsx`.
- Findings below list: file path(s), user impact, and concrete fix suggestions. Copy wording is deferred to Uri/Mira; frontend/a11y is owned by Kai.

---

## Prioritized findings

### Blocker

1) Search input lacks an accessible label (primary control)
- Paths: `src/components/search/SearchBar.tsx`
- Impact: Screen readers announce an unlabeled text input. Placeholder text is not a label and disappears; users relying on AT cannot discover how to run a search. Keyboard users have no programmatic name for the control.
- Fix (frontend/a11y):
  - Add a visually hidden label: `<label htmlFor="topic-search" className="sr-only">Search topic</label>` and `<input id="topic-search" aria-describedby="search-help" …>`.
  - Keep “Clear search” button (already has `aria-label`); ensure focus order lands back on the input after clearing.
  - Optional next step: promote suggestions to a proper combobox pattern (role="combobox", aria-expanded, aria-controls, listbox with active descendant) and arrow-key navigation.

2) Onboarding modal has no dialog semantics or focus management
- Paths: `src/components/onboarding/OnboardingModal.tsx`
- Impact: Focus is not trapped. No `role="dialog"`/`aria-modal`. No initial focus. Escape does not close. Keyboard users can tab into content behind the overlay.
- Fix (frontend/a11y):
  - Add `role="dialog" aria-modal="true" aria-labelledby="<h2 id>">` and set initial focus to the first actionable control. Trap tab within the modal and close on Escape. Return focus to the opener on close.
  - Add `aria-live="polite"` toast or inline status for “Step X of Y” updates (optional).

3) CDS contradiction (clinical/copy risk; verify and stage for copy fix)
- Paths confirmed:
  - Clinical copy: `src/components/search/synthesis/SynthesisClinicalActionCard.tsx` (header line “Not patient-specific advice — for clinical decision support”)
  - Onboarding goals: `src/components/onboarding/OnboardingModal.tsx` (includes “Ward decision support”)
  - Compliance/legal/landing: `src/pages/CompliancePage.tsx`, `src/pages/LegalTermsPage.tsx`, `src/pages/LandingPage.tsx` (state “not clinical advice / not CDS”)
- Impact: Mixed signals (“not CDS” vs “for clinical decision support”) are high-risk and undermine trust.
- Fix (clinical/copy – defer wording to Uri/Mira): Remove “for clinical decision support,” replace onboarding goal text. 
- Fix (frontend follow-up): render the disclaimer using a consistent component (e.g., `ClinicalSafetyNotice`) with adequate size/contrast rather than tiny italic text so it isn’t visually subordinate to the headline.

4) “GRADE Certainty” heading overclaims; color-only progress semantics
- Paths: `src/components/search/synthesis/SynthesisGradeCertainty.tsx`, `src/components/ui/evidenceGrade.ts`
- Impact:
  - Clinical/copy: Label reads like formal GRADE; see Uri’s blocker recommendation.
  - Frontend/a11y: Meaning is conveyed primarily by color and a visual bar; no `aria-label`/`aria-describedby` for AT users.
- Fix:
  - Copy (clinical): Rename header to “AI-estimated certainty (GRADE-style)” and add disclaimer text nearby (Uri).
  - A11y: Add a programmatic name and value. Example: wrap the bar group in `role="img"` with `aria-label="Certainty: Moderate"` or use a definition list with explicit text. Avoid color-only signaling.


### Should-fix

5) Conflict matrix lacks a clinician-facing empty state
- Paths: `src/components/search/ConflictMatrixPanel.tsx` (returns `null` when empty)
- Impact: Silent absence looks like a loading/bug to all users; clinicians don’t know guideline coverage is missing.
- Fix: When `conflictMatrix.length === 0`, render a neutral empty state explaining that no guideline matched the topic and that only trial evidence is shown. Provide a link/CTA to open the guideline browser if available.

6) Toasts are not announced to screen readers
- Paths: `src/components/ui/Toast.tsx`
- Impact: Status/errors appear visually but are not read out by AT. Users relying on AT miss time-sensitive feedback.
- Fix: Wrap the container with `aria-live="polite"` (and `role="status"`); use `role="alert"` for errors. Mark each toast as atomic if needed (`aria-atomic="true"`). Keep the Dismiss button (already has `aria-label`).

7) Other modals/drawers: missing roles, focus trap, Escape behavior
- Paths:
  - Claim provenance: `src/components/search/ClaimProvenanceModal.tsx` (has `role="dialog"`/`aria-modal` but no trap/initial focus/Escape)
  - Review picker: `src/components/review/ReviewListModal.tsx` (no dialog roles, no trap, no Escape)
  - Article drawer: `src/components/search/ArticleDetailDrawer.tsx` (sheet pattern; no `role="dialog"`, no labelled title, no focus management)
- Impact: Keyboard/AT users can lose context or tab behind overlays.
- Fix: Standardize a `Dialog` primitive that: sets `role="dialog" aria-modal="true" aria-labelledby`, traps focus, restores focus to trigger, closes on Escape, and supports portal mounting (or apply `aria-hidden`/`inert` to the rest of the page when open). Reuse for all overlays.

8) Search suggestions are click-only; no arrow-key navigation
- Paths: `src/components/search/SearchBar.tsx`
- Impact: Keyboard users cannot navigate MeSH/recent suggestions; screen readers don’t get combobox semantics.
- Fix: Adopt the ARIA combobox pattern (`role="combobox"` on the input wrapper, `aria-expanded`, `aria-controls` for the popup listbox, `aria-activedescendant` for the focused option, arrow key handling, Enter to apply).

9) Input removes default focus outline without replacement
- Paths: `src/components/search/SearchBar.tsx` (`outline-none`)
- Impact: Low-vision/keyboard users lose visible focus indication on the primary input.
- Fix: Add `focus-visible` ring styles directly on the input (e.g., Tailwind ring classes) so it’s clearly focused even when the parent container is decorated.

10) Route-change focus is not moved to main content
- Paths: `src/App.tsx`
- Impact: After route changes, keyboard/AT users may remain focused on prior controls. There is a skip link, but no automatic focus management on navigation.
- Fix: On `pathname` change, programmatically focus `#main-content` (already has `tabIndex={-1}`) or the page’s `<main>` landmark. Prefer consistent `<main id="main-content">` instead of a generic `<div>` wrapper.

11) Quiz option group lacks explicit group semantics; result feedback not announced
- Paths: `src/components/quiz/QuizActiveQuestionPanel.tsx`, `src/components/quiz/QuizOptionButton.tsx`
- Impact: Options are generic buttons; AT can’t perceive them as a single-choice set. “Correct!” vs. “Correct answer: X” feedback is not in a live region.
- Fix:
  - Wrap options in `role="radiogroup"` with a labelled question; each option `role="radio"` and `aria-checked` based on selection.
  - Announce grading result via `aria-live="polite"` or `role="status"`. Keep the existing `role="alert"` only for error states.

12) Forms: labels not programmatically associated
- Paths: `src/pages/CompliancePage.tsx` (date range fields)
- Impact: Visual labels aren’t linked to inputs; AT users don’t hear the label text when focusing the fields.
- Fix: Use `id` + `htmlFor` or `aria-labelledby` bindings.

13) Small, low-contrast helper text used pervasively
- Paths: many components use `text-[10px]` and `text-slate-400`
- Impact: Fails or skirts WCAG for normal text (4.5:1). Disclaimers and chip legends are hard to read on low-DPI/mobile.
- Fix: Raise helper text to ≥12–14px where feasible and use higher-contrast tokens (e.g., `text-slate-600`/`-700`). Keep uppercase tracking only where necessary.

14) ClinicalSafetyNotice phrasing and scope (copy alignment)
- Paths: `src/components/ui/ClinicalSafetyNotice.tsx`
- Impact: Phrase “before clinical use” was flagged by Uri. Also ensure it’s consistently reused wherever a clinical-action or appraisal is rendered so safety language isn’t missed.
- Fix: After copy is agreed, keep this in one shared component and reuse it across synthesis, synopsis, and clinical-answer cards.


### Nice-to-have

15) Keyboard shortcuts discoverability on Search
- Paths: `src/pages/search/useSearchPageKeyboard.ts`, `SearchHero`
- Suggest: Add a “Keyboard shortcuts” hint (e.g., “/ to focus search; j/k to move; s to save; a for analysis”) behind a “?” or tooltip; expose as `aria-describedby` for the search input.

16) Announce async states with `aria-busy` or live regions
- Paths: synthesis load (`SynthesisPanel`), claim index, synopsis/CONSORT/guidelines tabs.
- Suggest: Mark busy regions with `aria-busy="true"` or announce status in a `role="status"` container, then clear when content loads.

17) Empty states parity and links
- Paths: `ConflictMatrixPanel` (covered), check other panels for consistent empty states (e.g., `SynthesisSourcePapers`, “Grounded claims” panel when no job cache).

18) Drawer semantics
- Paths: `ArticleDetailDrawer.tsx`
- Suggest: Add `role="dialog" aria-modal="true" aria-labelledby` (sheet-style dialogs are still dialogs); set focus to the close button; constrain focus within the drawer while it’s open.


---

## Cross-checks against Uri’s clinical review (frontend hooks)

The following are clinical/copy items from Uri that require small UI plumbing to make safe and prominent once copy lands:
- Synthesis action card (CDS contradiction, wording): `src/components/search/synthesis/SynthesisClinicalActionCard.tsx` — switch to shared `ClinicalSafetyNotice` pattern and adequate prominence.
- “GRADE Certainty” hedging + banner: `src/components/search/synthesis/SynthesisGradeCertainty.tsx` — add disclaimer text and not color-only signal.
- Topic brief labels (“Key contraindications”, “What changes management” → softer language): `src/components/search/topicBrief/TopicBriefClinicalAnswerPanel.tsx` — front-end supports showing existing hard banners; ensure banners render when abstract-only or no guideline support.
- “Practice-changing” chip: `src/components/search/synthesis/synthesisPanelConfig.ts` — front-end will reflect revised labels when provided.


## Quick wins for beta

- Add an SR-only label to the search input and a focus-visible ring (10–15 mins).
- Add `aria-live` to toasts (10 mins).
- Add `role="dialog" aria-modal`, initial focus, and Escape close to `OnboardingModal` (30–45 mins). Reuse in `ReviewListModal` (fast follow).
- Render a clear empty state when the conflict matrix is empty (20 mins).
- Focus `#main-content` on route change in `App.tsx` (10 mins).


## File index (verified)

- Shell/routing: `src/App.tsx` (skip link exists; route-change focus missing)
- Copy contradiction surfaces: `SynthesisClinicalActionCard.tsx`, `OnboardingModal.tsx`, `CompliancePage.tsx`, `LegalTermsPage.tsx`, `LandingPage.tsx`
- Search/synthesis UX: `SearchPage.tsx`, `SearchBar.tsx`, `TopicBriefPanel.tsx`, `SynthesisPanel.tsx` + `synthesis/*`, `ConflictMatrixPanel.tsx`, `SynopsisTrustBanner.tsx`, `SynthesisGradeCertainty.tsx`, `synthesisPanelConfig.ts`
- Learning/cases/PHI: `QuizActiveQuestionPanel.tsx`, `QuizOptionButton.tsx`, `AdaptiveCasePage.tsx`, `CaseModePage.tsx`, `components/compliance/PhiDataNotice.tsx`
- Primitives: `components/ui/Button.tsx`, `components/ui/Toast.tsx`, modals (`ClaimProvenanceModal.tsx`, `ReviewListModal.tsx`), drawer (`ArticleDetailDrawer.tsx`)


## Notes on React patterns

- Lazy-loading and error boundaries are used thoughtfully. Consider centralizing a dialog primitive (portal + trap + Escape) to avoid one-off modal implementations.
- Avoid `outline-none` unless you supply a clear `:focus-visible` replacement on the same element.
- Prefer `<main>` for main content landmarks (you already use it in `SearchPage`; mirror that under the global shell and have the skip link target it).


— End of report.
