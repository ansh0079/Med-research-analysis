# Phase 3 Parity Checklist

Last updated: 2026-04-28

Use this checklist before removing legacy surfaces.

## 1) Saved Articles Sync

- [ ] Save article in modern UI appears in `Saved` view after reload.
- [ ] Unsave article removes it from server-backed list.
- [ ] Works with authenticated and session-based flows.

## 2) AI Analysis / Synthesis

- [ ] `AI Analysis` works with configured provider.
- [ ] `Synthesize` in selection basket returns response and references selected count.
- [ ] Error states are user-visible (not silent).

## 3) Vector Search

- [ ] `Vector` toggle appears only when backend advertises `features.vectorSearch`.
- [ ] Vector mode returns results for test query.
- [ ] Fallback to unified search works when vector is disabled.

## 4) Collaboration / Annotations

- [ ] Annotation create + list works for authenticated user.
- [ ] Real-time `annotation:new` updates connected clients.
- [ ] `presence:update` emits join/leave user list.

## 5) Analytics

- [ ] Summary cards render with non-empty data.
- [ ] Daily chart and top search list load without JS errors.
- [ ] `/metrics` endpoint responds in Prometheus format.

## 6) Verification Commands

Run all:

```bash
npm test --silent
npx tsc --noEmit
npx eslint . --quiet
npm run build
npm audit --omit dev --audit-level=high
```

## 7) Legacy Freeze Policy

- [x] CI blocks feature edits to legacy `scripts/` files on PRs (`tools/check-legacy-freeze.js`).
- [ ] If emergency legacy fix is needed, use `ALLOW_LEGACY_EDIT=true` in CI run with incident note.
