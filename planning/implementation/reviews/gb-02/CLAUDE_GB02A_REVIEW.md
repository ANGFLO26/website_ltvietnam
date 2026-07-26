# CLAUDE INDEPENDENT REVIEW — GB-02A

**Subject:** GB-02A — Gate B governance, evidence and plan-history preservation
**Reviewer:** Claude (independent reviewer)
**Review date:** 2026-07-25
**Mode:** READ-ONLY. No branch modified, no merge, no tag created, no dependency installed, no Docker mutation, no Git history altered, no push.

---

## 1. Verdict

# `REQUEST CHANGES`

One blocking defect (**GB2-01**). Sixteen of the seventeen verification items pass; item 8 fails, and item 15 is consequently partial.

The plan-history manifest does **not** hash exact Git object bytes. It hashes a CRLF-converted rendering produced by `git archive` under this machine's `core.autocrlf=true`. Three tracked governance documents state the opposite, and the CI workflow introduced by this same PR runs on `ubuntu-latest`, where the manifest will fail all 80 entries.

This is not a fundamental soundness problem — the historical file content is genuinely preserved and recoverable, path coverage is exactly complete, and the remediation is mechanical. That is why the verdict is `REQUEST CHANGES` rather than `FAIL`.

---

## 2. Reviewed target

| Item | Value |
|---|---|
| **PR number** | **#2** — `chore(gate-b): preserve evidence and planning history`, state `open` |
| **Head commit SHA** | `2e8c3821f42a1ffdb138fce530981ec6012feffc` |
| Head ref | `chore/gb-01-gate-b-verification` |
| Base ref / SHA | `main` @ `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0` |
| Local HEAD | `2e8c382…` — identical to remote head |
| Upstream | `origin/chore/gb-01-gate-b-verification` |
| Position vs `origin/main` | 1 ahead, 0 behind |
| Working tree at review start | clean |

PR metadata was obtained from the public GitHub API (`gh` is not installed on this machine and none was installed to compensate). The API head SHA, head ref and base SHA match the local branch exactly.

The commit is 13 additions, zero modifications, zero deletions.

---

## 3. Verification results

| # | Item | Result | Basis |
|---:|---|:--:|---|
| 1 | GB-01 evidence and Claude GB-01 review tracked, committed, pushed | **PASS** | All four artifacts appear as `A` in `2e8c382`; `git ls-files` confirms tracking; `git ls-remote --heads origin` returns `2e8c382…` for this branch — local equals remote |
| 2 | Working tree clean after commit | **PASS** | `git status --porcelain` empty at review start |
| 3 | Branch has upstream and exists remotely | **PASS** | `@{u}` = `origin/chore/gb-01-gate-b-verification`; present in `ls-remote --heads` |
| 4 | Evidence policy states tested-SHA semantics | **PASS** | `implementation/evidence/README.md:13` — "The subject SHA therefore does not imply that the subject commit already contains the evidence files." Directly closes GB-R01's self-nullifying reference |
| 5 | `.gitignore` does not ignore committed evidence | **PASS** | `git check-ignore -v` → committed `commands.log` **not ignored** (exit 1); future `implementation/evidence/abc123/p0/build.log` re-included by `.gitignore:40` negation; control `somewhere/random.log` correctly ignored by `:38` |
| 6 | No secrets/PII in evidence | **PASS with LOW note** | Secret/token/key scan clean — only the literal word "secrets" in a `.gitignore` comment and one prose sentence. No emails, no phone numbers, no credentials. Local OS username appears 4× — see GB2-03 |
| 7 | Manifest covers every file under v0.1–v0.4.1 at `9e69469` | **PASS** | Ground truth via `git ls-tree -r 9e69469`: v0.1=12, v0.2=15, v0.3=16, v0.4=18, v0.4.1=19, **total 80**. Manifest has exactly 80 entries; my independent path set diffs 1:1 with zero missing and zero extra |
| 8 | Hashes computed from exact Git object bytes | **FAIL** | See GB2-01. Manifest values equal SHA-256 of CRLF-converted bytes, not blob bytes |
| 9 | PowerShell verification rerun PASS | **PASS** | `verify-plan-history.ps1` → `PLAN_HISTORY_VERIFICATION=PASS`, `manifest_entries=80`, `archive_files=80`, exit 0. Passes only under Windows/`autocrlf=true` — see GB2-01 |
| 10 | No missing, duplicate or extra manifest entry | **PASS** | 80/80 path-level match against ground truth; no duplicates; ordering is correct `LC_ALL=C` ordinal order — `v0.4.1/` precedes `v0.4/` because `.` (0x2E) sorts before `/` (0x2F), which is right and is enforced by both verifiers |
| 11 | Git history not rewritten | **PASS** | `git merge-base --is-ancestor origin/main HEAD` → yes; `HEAD^` = `3794caf`; `3794caf`/`9e69469`/`3246f07` unchanged; reflog shows only `commit` and `checkout`, no rebase/reset/amend/force |
| 12 | Tag proposal distinguishes required / retained-reference / optional governance | **PASS** | `TAG_PROPOSAL.md`: `docs-v1.2.1-approved` = "explicitly required by implementation plan v1.0"; `planning-history-v0.1-v0.4.1` = "closes the plan-history retained-reference requirement"; `implementation-plan-v1.0-approved` = "a deliberate project governance choice, not an originally mandated tag name". Correctly resolves my GB-R05 |
| 13 | No tag was created | **PASS** | `git tag --list` empty; `git ls-remote --tags origin` empty. No tag locally or remotely |
| 14 | Workflow least permissions and full-history checkout | **PASS** | `permissions: contents: read` at workflow scope, no job-level widening; `actions/checkout@v4` with `fetch-depth: 0` and `fetch-tags: true`; `timeout-minutes: 10`; both actions pinned to major versions |
| 15 | Workflow verifies both manifests and uploads sanitized evidence | **PARTIAL** | Both manifests are verified (steps "Verify approved v1.0 manifest" and "Verify plan-history Git objects") and a sanitized report is uploaded via `actions/upload-artifact@v4` with `if-no-files-found: error`. But the plan-history step **will fail on `ubuntu-latest`** — GB2-01. Report contents are sanitized: workflow metadata, tested commit, commands, results only |
| 16 | `doc/` and `planning/implementation/v1.0/` unchanged | **PASS** | `git diff --stat origin/main HEAD -- doc/ planning/implementation/v1.0/` → empty. Confirmed independently by the commit's name-status list containing no path under either tree |
| 17 | No source code, migration SQL, pnpm activation or Docker mutation | **PASS** | Every added path is `.md`, `.sha256`, `.txt`, `.log`, `.yml`, `.ps1`, `.sh` or `.gitignore`. No `.sql`, no application source, no lockfile. `pnpm` still absent (exit 127); Docker engine still unreachable; no image, container, volume or database created |

---

## 4. GB2-01 — the blocking defect, in detail

### What the artifacts claim

| Location | Claim |
|---|---|
| `PLAN_HISTORY_PROVENANCE.md:28` | "The manifest was generated from **exact Git object bytes** without checking historical directories into the active working tree" |
| `GB02A_GOVERNANCE_REMEDIATION.md:76` | "`PLAN_HISTORY_MANIFEST.sha256` hashes **exact Git-object bytes**" |
| `GB02A_GOVERNANCE_REMEDIATION.md:89` | "Generation used `git archive` to a temporary tar, extracted **exact bytes**" |
| `GB02A_GOVERNANCE_REMEDIATION.md:125` | workflow "verifies the 80-file plan-history manifest against **source Git objects**" |

### What is actually stored

Taking `planning/implementation/v0.1/00_IMPLEMENTATION_PLAN_OVERVIEW.md`, blob `150895657f03efce74c504f107b9aec035b4ab6b`:

```
git cat-file blob 1508956 | sha256sum
  → 27b9fea8fd8f57658e9b19f750e977fd06fbb2599749c27666a95a4d3a29e917   (exact Git object bytes, LF)

git cat-file blob 1508956 | sed 's/$/\r/' | sha256sum
  → 800607c49aaa4cbd81b020046f409c26f6ac43b6f09980ed7e2c78a659b13721   (CRLF-converted)

PLAN_HISTORY_MANIFEST.sha256
  → 800607c49aaa4cbd81b020046f409c26f6ac43b6f09980ed7e2c78a659b13721   ← matches the CRLF form
```

I regenerated my own manifest by hashing `git cat-file blob` output for all 80 files. **All 80 hashes differ from the manifest**, while all 80 paths match exactly.

### Root cause, reproduced

```
git config --show-origin --get core.autocrlf
  → file:C:/Program Files/Git/etc/gitconfig    true      (Git for Windows system default)

git archive --format=tar 9e69469 -- <path> | tar -x -C <tmp>
file <extracted>
  → UTF-8 text, with CRLF line terminators
sha256sum <extracted>
  → 800607c49aaa…                                        (reproduces the manifest value)
```

`git archive` applies the `core.autocrlf` working-tree conversion. The repository has no `.gitattributes` to pin `eol`, so the output encoding is governed entirely by an unversioned local Git setting. The hashes are therefore a property of the reviewer's machine, not of the Git objects.

### Proof of CI failure

Running the committed verifier unchanged, varying only the Git config via environment (no config file written):

```
bash planning/implementation/history/verify-plan-history.sh
  → PLAN_HISTORY_VERIFICATION=PASS, 80/80, exit 0          (autocrlf=true, this machine)

GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.autocrlf GIT_CONFIG_VALUE_0=false \
bash planning/implementation/history/verify-plan-history.sh
  → diff -u reports all 80 entries mismatched, exit 1      (Linux/CI equivalent)
```

`.github/workflows/gate-b-baseline.yml:16` sets `runs-on: ubuntu-latest`, where `core.autocrlf` is unset. The step "Verify plan-history Git objects" will fail on this PR.

### Why the v1.0 manifest is unaffected

`V1_0_FILE_MANIFEST.sha256` is **portable and correct**. For `00_IMPLEMENTATION_PLAN_OVERVIEW.md` the manifest value, the blob bytes and the working-tree bytes are all `2723dbb6…`, and `file` reports no CRLF. Those files were authored with LF and have not been re-materialised through a conversion path. `sha256sum --strict -c` passes here and will pass on Linux.

The asymmetry is itself the evidence that the CRLF encoding was an unnoticed artifact of `git archive` on Windows, not a deliberate policy.

### Why this blocks

1. Four tracked statements asserting "exact Git object bytes" are false, in the documents whose purpose is provenance.
2. The PR's own CI workflow fails on the PR.
3. Verification is not reproducible off Windows, so no Linux or macOS reviewer can confirm the preservation claim.
4. GB-R02 asked for durable plan-history preservation. A manifest whose verification depends on an undeclared local Git setting is not durable.

### What is genuinely fine

Path coverage is exactly complete (80/80, no missing, extra or duplicate), ordering is correct and enforced, scope containment is enforced, the source commit is right, and the underlying file content is fully recoverable from `9e69469`. Only the hash basis and the wording are wrong.

---

## 5. Findings

| ID | Severity | Evidence | Required action | Blocks GB-02A merge |
|---|---|---|---|:--:|
| **GB2-01** | **HIGH** | Manifest entry for `v0.1/00_IMPLEMENTATION_PLAN_OVERVIEW.md` is `800607c4…`, which equals SHA-256 of the **CRLF-converted** blob; exact Git object bytes hash to `27b9fea8…`. All 80 entries differ from blob-byte hashes while all 80 paths match. `core.autocrlf=true` originates from `C:/Program Files/Git/etc/gitconfig`; there is no `.gitattributes`. Re-running the committed `verify-plan-history.sh` with `core.autocrlf=false` (Linux/CI equivalent) fails all 80 entries, exit 1, while `runs-on: ubuntu-latest` at `gate-b-baseline.yml:16`. Claims to the contrary at `PLAN_HISTORY_PROVENANCE.md:28` and `GB02A_GOVERNANCE_REMEDIATION.md:76,89,125`. | Regenerate `PLAN_HISTORY_MANIFEST.sha256` from exact Git object bytes — e.g. `git cat-file blob` per entry, or `git -c core.autocrlf=false -c core.eol=lf archive`. Pin the same setting inside both `verify-plan-history.sh` and `verify-plan-history.ps1` so the result cannot depend on ambient config. Optionally add `.gitattributes` with `* -text` or an explicit `eol` policy. Then correct the four "exact Git object bytes" statements, or restate them accurately as "working-tree rendering under `core.autocrlf=true`" if the CRLF basis is deliberately retained — but a portable basis is strongly preferable. Re-run both verifiers and confirm the CI job is green. | **YES** |
| **GB2-02** | **MEDIUM** | `GB02A_GOVERNANCE_REMEDIATION.md:186` acknowledges that "successful remote execution and immutable run/artifact identity for the new CI workflow" is unresolved. Only local structural validation of the YAML was performed (`:134`). No run ID or artifact URL is recorded anywhere in tracked evidence. Per `implementation/evidence/README.md:17-20`, a PASS requires committed evidence **or** an immutable CI artifact URL and run ID. | After GB2-01 is fixed, let the workflow run on PR #2, confirm all six steps green, and record the run ID and artifact identity in tracked evidence. Until then the workflow is unproven and, given GB2-01, is expected to fail. | NO — but it cannot be treated as satisfied, and PR checks will be red until GB2-01 is fixed |
| **GB2-03** | **LOW** | The local OS username appears in committed evidence at `commands.log:155,165,175` and `environment.txt:28`, via `C:\Users\taiphan\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`. `implementation/evidence/README.md:32` requires evidence to exclude "full personally identifiable information". | Decide the policy explicitly: either accept local tool paths as non-sensitive host metadata and say so in the evidence README, or redact the user segment (e.g. `C:\Users\<user>\…`) in future evidence. Do **not** rewrite the existing raw log to fix this — the raw-output guarantee outranks the cosmetic concern, and the commit author identity is public regardless. | NO |
| **GB2-04** | **LOW** | Neither `verify-plan-history.sh` nor `verify-plan-history.ps1` pins `core.autocrlf`/`core.eol` when invoking `git archive`, so both produce environment-dependent results. This is the enabling condition for GB2-01 rather than a separate defect. | Fold into the GB2-01 fix: pass the config explicitly on the `git archive` invocation in both scripts so a future regeneration cannot silently re-introduce an ambient-config dependency. | NO — subsumed by GB2-01 |

**Blocking total: 1 (GB2-01).**

---

## 6. What GB-02A got right

Recorded because it is substantial and directly responsive to my GB-01 findings:

- **GB-R01 closed in substance.** Evidence and the GB-01 review are committed and pushed; the branch now has a unique commit and an upstream; the tested-SHA semantics are defined in a tracked policy at `implementation/evidence/README.md:13`, which resolves the self-nullifying path reference cleanly rather than by renaming the directory.
- **GB-R02 addressed** with a manifest, provenance record, two independent verifiers and a retained-reference tag proposal — the mechanism is right even though the hash basis is not.
- **GB-R03 closed.** `git ls-remote --tags origin` is now part of the recorded procedure and of the GB-02B requirement in `TAG_PROPOSAL.md:29-35`.
- **GB-R04 closed.** `.gitignore` exists, and I verified by probe that it ignores the right things while explicitly re-including evidence logs.
- **GB-R05 closed precisely.** `implementation-plan-v1.0-approved` is now labelled "a deliberate project governance choice, not an originally mandated tag name".
- **GB-R06 closed.** `GB02A_GOVERNANCE_REMEDIATION.md:189` restates the GB-01 clean-tree observation as a timestamped pre-evidence snapshot.
- **My GB-01 review was committed unaltered** — SHA-256 `ccd4a83a…`, verdict line and all six GB-R findings intact. No softening of an adverse review.
- **No overclaiming.** §L states Gate B remains NOT PASSED and P0 unauthorized. §K lists six unresolved blockers. §F:101 volunteers that an earlier draft of the Bash verifier had an ordering bug that was caught and fixed — disclosed rather than hidden.
- Scope discipline held: no tag, no dependency, no Docker mutation, no `doc/` or v1.0 change, no source or SQL.

---

## 7. Conditions to clear `REQUEST CHANGES`

1. Regenerate the plan-history manifest from exact Git object bytes.
2. Pin `core.autocrlf`/`core.eol` inside both verifiers, and consider `.gitattributes`.
3. Correct the four inaccurate provenance/report statements.
4. Re-run both verifiers; confirm 80/80 PASS on Windows **and** under a Linux-equivalent config.
5. Let the workflow execute on PR #2, confirm green, and record run ID and artifact identity (GB2-02).
6. Optionally settle the GB2-03 redaction policy in the evidence README.

None of these requires a new branch or any history rewrite — an additional commit on `chore/gb-01-gate-b-verification` is sufficient.

---

## 8. Status after this review

| Item | Status |
|---|---|
| GB-02A merge | **REQUEST CHANGES** — blocked by GB2-01 |
| Gate B | **NOT PASSED** — unchanged; tags, pnpm, Docker engine, PostgreSQL 16 and a green CI run all remain outstanding |
| P0 start | **NOT AUTHORIZED** |
| Tags | none created, local or remote — correct for GB-02A |
| Branch / history / remote | untouched by this review |

**Reviewer scope statement.** This review executed read-only commands only, plus one public unauthenticated GitHub API read for PR metadata. The single Git-config override used to simulate the Linux CI environment was passed via `GIT_CONFIG_*` environment variables for one command; no Git configuration file was written. No branch was modified, no merge or push performed, no tag created, no dependency installed, no Docker state changed. The only file written is this report at `planning/implementation/reviews/gb-02/CLAUDE_GB02A_REVIEW.md`, which is currently untracked and therefore leaves the working tree dirty until it is committed or removed.
