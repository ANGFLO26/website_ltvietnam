# SAFE CLEANUP PLAN — NOT EXECUTED

**Plan date:** 2026-07-25  
**State:** PREPARED ONLY — NO FILE MOVED, DELETED OR ARCHIVED  
**Gate A:** PASSED  
**Gate B:** NOT MET

## 1. Purpose

This document prepares a recoverable, move-only organization of historical implementation-plan versions after Git becomes valid and the user separately approves cleanup. It does not authorize or execute cleanup.

## 2. Proposed post-approval structure

```text
planning/
└── implementation/
    ├── v1.0/
    ├── reviews/
    │   ├── codex-round3/
    │   ├── codex-final-v0.3/
    │   ├── claude-final-v0.4.1/
    │   └── v1.0-assembly/
    └── archive/
        └── plans/
            ├── v0.1/
            ├── v0.2/
            ├── v0.3/
            ├── v0.4/
            └── v0.4.1/
```

Other existing review directories not named in this proposed tree remain untouched unless the user explicitly scopes them into a later operation.

## 3. Mandatory preconditions

Cleanup may begin only when all ten conditions pass:

1. Git is valid.
2. A baseline commit exists.
3. Tag `docs-v1.2.1-approved` exists.
4. The v1.0 manifest verifies.
5. A plan-history hash manifest exists.
6. Every archive target is absent or empty and exact source/target paths are verified.
7. The operation is move-only; nothing is deleted.
8. Post-move checksums match the pre-move plan-history manifest.
9. The archive operation is committed separately from Git restoration and v1.0 assembly.
10. The user explicitly approves the cleanup operation after reviewing the exact move list.

## 4. Safe execution sequence for a future round

1. Read-only inventory source directories and archive targets.
2. Verify absolute paths remain under `planning/implementation/`.
3. Recompute and verify v1.0 plus plan-history manifests.
4. Capture clean/known Git status and baseline/tag evidence.
5. Present the exact one-to-one move list for final user confirmation.
6. Move one version directory at a time; never delete.
7. Recompute checksums after each move and stop on the first mismatch.
8. Verify v1.0 and review directories remain in place.
9. Commit only the archive move as its own operation.
10. Record the post-move manifest, commit SHA and recovery instructions.

## 5. Recovery

If a move or checksum check fails, stop immediately. Before committing, move the affected directory back to its verified original path and rerun the pre-move checksum. After a committed archive operation, recovery uses a normal Git revert or an approved forward move; history is never force-rewritten.

## 6. Current readiness

Cleanup is **not ready** because Git is invalid, no baseline commit/tag or plan-history hash manifest exists, and the user has not approved a concrete cleanup execution. No archive directory or historical plan directory was mutated in Round 8.
