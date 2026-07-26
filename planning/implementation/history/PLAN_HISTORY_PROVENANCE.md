# Plan History Provenance

## Source

- Source commit: `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`
- Commit subject: `add_doc`
- Author date: `2026-07-25T20:41:41+07:00`
- Committer date: `2026-07-25T20:41:41+07:00`

The manifest hashes the exact content bytes stored in each Git blob at source commit
`9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`, not files currently present in the working tree and not an archive or checkout rendering.

## Included history

| Original directory | Files |
|---|---:|
| `planning/implementation/v0.1/` | 12 |
| `planning/implementation/v0.2/` | 15 |
| `planning/implementation/v0.3/` | 16 |
| `planning/implementation/v0.4/` | 18 |
| `planning/implementation/v0.4.1/` | 19 |
| **Total** | **80** |

Paths in `PLAN_HISTORY_MANIFEST.sha256` are original repository-relative paths, ordered by ordinal/bytewise lexicographic path order. The manifest contains every blob under the five directories above and no entry outside them.

## Exact-blob generation

The reproducible generators enumerate the source inventory with:

```text
git ls-tree -r -z --full-tree 9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd -- planning/implementation/v0.1 planning/implementation/v0.2 planning/implementation/v0.3 planning/implementation/v0.4 planning/implementation/v0.4.1
```

For every record they parse mode, type, blob OID, and original path; reject non-blob entries; and hash the binary stream from:

```text
git cat-file blob <blob_oid>
```

PowerShell passes `StandardOutput.BaseStream` directly to `SHA256.ComputeHash()` through `System.Diagnostics.ProcessStartInfo`. Bash uses `git cat-file blob "$blob_oid" | sha256sum` with `set -euo pipefail`. Neither implementation converts blob output to a string, uses PowerShell text redirection, exports the tree, checks out historical files, or hashes working-tree content.

Generation commands:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File planning/implementation/history/generate-plan-history-manifest.ps1
```

```bash
bash planning/implementation/history/generate-plan-history-manifest.sh
```

## Correction history

The manifest first committed in `2e8c3821f42a1ffdb138fce530981ec6012feffc` used `git archive`, extracted the result, and hashed the exported files. On the generating Windows environment, system configuration set `core.autocrlf=true`; `git archive` produced CRLF-converted text. The old manifest was therefore platform/config dependent and did not hash exact blob bytes.

For the first historical file:

- blob OID: `150895657f03efce74c504f107b9aec035b4ab6b`;
- exact blob SHA-256: `27b9fea8fd8f57658e9b19f750e977fd06fbb2599749c27666a95a4d3a29e917`;
- prior archive/export and manifest SHA-256: `800607c49aaa4cbd81b020046f409c26f6ac43b6f09980ed7e2c78a659b13721`.

The correction replaces the archive basis with blob OIDs plus direct `git cat-file blob` hashing. `core.autocrlf` does not affect `git cat-file blob` bytes. No historical commit or historical file was rewritten.

## Verification

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File planning/implementation/history/verify-plan-history.ps1
```

POSIX Bash:

```bash
bash planning/implementation/history/verify-plan-history.sh
```

Both verifiers independently enumerate the exact source tree and fail on a missing source commit, non-blob entry, malformed hash, missing/extra/duplicate path, wrong path order, or hash mismatch.

## History integrity and recovery

The active-tree deletion in commit `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0` did not rewrite Git history. The historical files remain recoverable from the source commit.

Examples that do not modify the active tree:

```text
git ls-tree -r --name-only 9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd -- planning/implementation/v0.1 planning/implementation/v0.2 planning/implementation/v0.3 planning/implementation/v0.4 planning/implementation/v0.4.1
git archive --format=tar --output=plan-history.tar 9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd -- planning/implementation/v0.1 planning/implementation/v0.2 planning/implementation/v0.3 planning/implementation/v0.4 planning/implementation/v0.4.1
```

The archive command above is a recovery/export example only; it is not a hash source.

An authorized recovery into a working tree, only when explicitly approved, can use:

```text
git restore --source=9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd --worktree -- planning/implementation/v0.1 planning/implementation/v0.2 planning/implementation/v0.3 planning/implementation/v0.4 planning/implementation/v0.4.1
```

## Retained reference proposal

`planning-history-v0.1-v0.4.1` remains proposed as a retained tag at the source commit. This document records a proposal only; no tag is created by this correction. See `TAG_PROPOSAL.md`.
