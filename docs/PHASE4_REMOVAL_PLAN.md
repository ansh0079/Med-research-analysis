# Phase 4 Legacy Removal Plan

Last updated: 2026-04-28

Status: Executed (legacy runtime removed)

This document defines the controlled removal pass for legacy UI surfaces and is now kept as a historical execution record.

## Objective

Remove legacy HTML entrypoints, script bundles, and bridge-only compatibility layers after parity is validated in the modern React app.

## Removal Candidate Set

### A) Delete legacy entrypoints

- `index-secure.html`
- `index-features.html`

### B) Delete legacy runtime scripts

- `scripts/app.js`
- `scripts/app-features.js`
- `scripts/components.js`
- `scripts/components-user.js`
- `scripts/ai-analysis.js`
- `scripts/api-bridge.js`
- `scripts/api-user.js`
- `scripts/api.js`
- `scripts/hooks.js`
- `scripts/utils.js`
- `scripts/services-secure.js`
- `scripts/legacy-window.js`
- `scripts/legacy-window.mjs` (if present)

### C) Delete modern-to-legacy bridge sources

- `src/legacy/windowEntry.ts`
- `src/legacy/windowMap.ts`
- `src/legacy/legacyStubs.ts`

### D) Keep (non-UI operational scripts)

- `scripts/001_initial_baseline.sql`
- `scripts/security-fixes.js`
- `scripts/setup-monitoring.js`

## Package and Build Changes

After deleting legacy artifacts, update `package.json`:

- Remove `build:legacy-window`
- Remove `build:legacy-esm`
- Change `build:full` to `npm run build`

## Known Reference Impact (must be cleaned)

- `README.md` (legacy fallback mention)
- `LAUNCH_CHECKLIST.md` (legacy startup flow)
- `NEXT_STEPS.md` (legacy file instructions)
- `FEATURES_COMPLETE.md` (legacy commands/entrypoint references)
- `FRONTEND_FEATURES.md` (legacy file table)
- `FEATURES_SUMMARY.md` (legacy tree references)
- `ADVANCED_FEATURES_COMPLETE.md` (legacy test URL instructions)
- `ROADMAP.md` and `LEGACY_DEPRECATION_PLAN.md` (historical references can remain if clearly marked retired)

## Execution Sequence

1. Verify `PHASE3_PARITY_CHECKLIST.md` is complete.
2. Run `npm run verify:legacy-removal-ready` and resolve all blocking references.
3. Remove legacy files in A/B/C.
4. Update `package.json` scripts and docs.
5. Run full verification:
   - `npm test --silent`
   - `npx tsc --noEmit`
   - `npx eslint . --quiet`
   - `npm run build`
6. Smoke test modern paths (`/`, search, AI analysis, vector mode, analytics, collaboration).

## Exit Criteria

- No legacy entrypoints or runtime files remain in repository.
- No runtime docs instruct users to open legacy pages.
- CI passes on modern-only path.
