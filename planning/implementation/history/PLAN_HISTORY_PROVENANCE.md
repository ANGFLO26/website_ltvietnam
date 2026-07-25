# Plan History Provenance

## Source

- Source commit: `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`
- Commit subject: `add_doc`
- Author date: `2026-07-25T20:41:41+07:00`
- Committer date: `2026-07-25T20:41:41+07:00`

The manifest hashes the file contents as stored at source commit
`9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`, not files currently present in the working tree.

## Included history

| Original directory | Files |
|---|---:|
| `planning/implementation/v0.1/` | 12 |
| `planning/implementation/v0.2/` | 15 |
| `planning/implementation/v0.3/` | 16 |
| `planning/implementation/v0.4/` | 18 |
| `planning/implementation/v0.4.1/` | 19 |
| **Total** | **80** |

Paths in `PLAN_HISTORY_MANIFEST.sha256` are original repository-relative paths, ordered by ordinal lexicographic path order. The manifest contains every file under the five directories above and no file outside them.

## Generation

The manifest was generated from exact Git object bytes without checking historical directories into the active working tree:

```text
git archive --format=tar --output=<temporary>/history.tar 9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd -- planning/implementation/v0.1 planning/implementation/v0.2 planning/implementation/v0.3 planning/implementation/v0.4 planning/implementation/v0.4.1
tar -xf <temporary>/history.tar -C <temporary>/extract
Get-FileHash -Algorithm SHA256 <each extracted file>
```

The generation process sorted repository-relative paths before hashing and removed only its generated temporary directory.

## Verification

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File planning/implementation/history/verify-plan-history.ps1
```

POSIX Bash:

```bash
bash planning/implementation/history/verify-plan-history.sh
```

Both verifiers archive the five directories from the source commit, extract them to a temporary directory, hash the extracted bytes, and fail on a missing, extra, duplicate, out-of-order, malformed, or mismatched manifest entry.

## History integrity and recovery

The active-tree deletion in commit `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0` did not rewrite Git history. The historical files remain recoverable from the source commit.

Examples that do not modify the active tree:

```text
git ls-tree -r --name-only 9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd -- planning/implementation/v0.1 planning/implementation/v0.2 planning/implementation/v0.3 planning/implementation/v0.4 planning/implementation/v0.4.1
git archive --format=tar --output=plan-history.tar 9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd -- planning/implementation/v0.1 planning/implementation/v0.2 planning/implementation/v0.3 planning/implementation/v0.4 planning/implementation/v0.4.1
```

An authorized recovery into a working tree, only when explicitly approved, can use:

```text
git restore --source=9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd --worktree -- planning/implementation/v0.1 planning/implementation/v0.2 planning/implementation/v0.3 planning/implementation/v0.4 planning/implementation/v0.4.1
```

## Retained reference proposal

`planning-history-v0.1-v0.4.1` is proposed as a retained tag at the source commit. This document records a proposal only; GB-02A creates no tag. See `TAG_PROPOSAL.md`.
