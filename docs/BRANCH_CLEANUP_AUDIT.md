# Branch Cleanup Audit

Last updated: 2026-07-07

This note tracks stale `cursor/*` branches that were used as sources for cherry-picks or feature ports. Their tips are not ancestors of `main`, so deleting them should wait until the remaining differences are either confirmed obsolete or intentionally ported elsewhere.

## Candidates

| Branch | Tip | Status | Notes |
| --- | --- | --- | --- |
| `origin/cursor/phase-4-frontend-completeness-885f` | `521ee9d Complete Phase 4 frontend completeness work` | Keep for now | Some work appears represented on `main` through later team-route and frontend commits, but not all files map cleanly. Missing examples include `database/migrations/077_team_activity_assignments.sql` and `tests/unit/userPreferences.test.js`. |
| `origin/cursor/phase-5-code-health-885f` | `0a46384 Phase 5: decompose mega route files and clean ESLint imports` | Keep for now | The branch's route-decomposition files are mostly absent from `main`. This may be intentional because routing was later consolidated differently, but it should be explicitly marked obsolete before deletion. |
| `origin/cursor/cloud-agent-1783357052413-04q7a` | `9bde589 refactor(search): extract reusable SearchPage panel components` | Keep for now | Several features are present on `main`, including `server/services/agentTurnService.js`, `server/services/agentSideEffectService.js`, `src/components/search/SearchPagePanels.tsx`, `src/components/knowledge/KnowledgeReviewPanels.tsx`, and `tests/unit/emailService.test.js`. Missing examples include `src/hooks/useQuizSession.ts`, quiz extraction components, `server/services/authTokenService.js`, and `docs/DEPENDENCY_POSTURE.md`. |

## Verification Snapshot

All three remote branch tips were checked against `main` and were not merged:

```text
origin/cursor/phase-4-frontend-completeness-885f NOT-merged-into-HEAD
origin/cursor/phase-5-code-health-885f NOT-merged-into-HEAD
origin/cursor/cloud-agent-1783357052413-04q7a NOT-merged-into-HEAD
```

Ahead/behind counts from `main...branch` at audit time:

```text
origin/cursor/phase-4-frontend-completeness-885f  63  1
origin/cursor/phase-5-code-health-885f           63  1
origin/cursor/cloud-agent-1783357052413-04q7a    50  13
```

## Recommended Cleanup Path

1. Review each missing item and mark it either `ported elsewhere`, `obsolete by later design`, or `still worth porting`.
2. If nothing remains worth porting, delete the local stale branch:

   ```bash
   git branch -D cursor/cloud-agent-1783357052413-04q7a
   ```

3. Delete the remote branches:

   ```bash
   git push origin --delete \
     cursor/phase-4-frontend-completeness-885f \
     cursor/phase-5-code-health-885f \
     cursor/cloud-agent-1783357052413-04q7a
   ```

