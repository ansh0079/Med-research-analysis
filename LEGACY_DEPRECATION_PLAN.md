# Legacy Surface Deprecation Plan

Last updated: 2026-04-28

Status: Completed (Phase 4 shipped)

## Objective (historical)

Retire the legacy HTML + Babel runtime surfaces (`index-secure.html`, `index-features.html`, `scripts/*.js`) after modern React (`index.html` + `src/`) reaches complete parity. This objective is now completed.

## Why

- Legacy pages load large browser-side Babel bundles and duplicate logic.
- Security and performance hardening is now focused on the modern stack.
- Keeping both stacks increases maintenance cost and regression risk.

## Scope

Legacy assets targeted for retirement:

- `index-secure.html`
- `index-features.html`
- `scripts/components.js`
- `scripts/components-user.js`
- `scripts/app.js`
- `scripts/app-features.js`
- `scripts/ai-analysis.js`
- `scripts/api-bridge.js` (after migration bridge is no longer needed)
- `scripts/legacy-window.js` (build output)

## Rollout Phases

### Phase 1 (now) — Deprecation notices and guardrails

- [x] Add visible deprecation banner to legacy HTML entrypoints.
- [x] Keep functionality intact (non-breaking).
- [x] Document migration and timeline.

### Phase 2 — Default modern entry

- [x] Route navigation/docs to `index.html` as the default user path.
- [x] Add optional `?legacy=1` path for temporary fallback.
- [x] Track legacy usage rate (basic telemetry event).

### Phase 3 — Feature parity closure

- [ ] Verify parity for:
  - Saved articles sync
  - AI analysis/synthesis
  - Vector search toggle
  - Collaboration/annotations
  - Analytics pages
- [x] Freeze new development in `scripts/` (CI guard via `tools/check-legacy-freeze.js`).

### Phase 4 — Removal

- [x] Remove legacy HTML pages and script bundles.
- [x] Remove legacy build scripts from `package.json`.
- [x] Remove bridge-only globals from `src/legacy/*`.
- [x] Final cleanup pass in docs and tests.

## Exit Criteria

- No production traffic on legacy entrypoints for 14 consecutive days.
- CI and E2E coverage fully validates modern UI paths.
- Product signoff confirms no user-critical regression.
