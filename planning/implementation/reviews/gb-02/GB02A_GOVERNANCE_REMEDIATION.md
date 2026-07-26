# GB-02A — Governance and Evidence Remediation

Review date: 2026-07-25  
Repository: `https://github.com/ANGFLO26/website_ltvietnam.git`  
Task branch: `chore/gb-01-gate-b-verification`  
Task base: `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0`

GB-02A resolves Git governance, evidence preservation, plan-history provenance, remote tag inspection, ignore policy, and minimal Gate B CI. GB-02A-C1 corrects the plan-history hash basis after Claude found that the first implementation hashed a CRLF archive rendering rather than exact Git blob bytes. Neither task claims Gate B PASS.

### A. Source state

Before GB-02A mutation:

- current branch was `chore/gb-01-gate-b-verification`;
- `HEAD`, `main`, and `origin/main` all resolved to `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0`;
- remote `origin` fetch/push URL was `https://github.com/ANGFLO26/website_ltvietnam.git`;
- remote heads were `main` and `chore/cleanup-planning-readme`;
- `git ls-remote --tags origin` returned no tags;
- the working tree contained exactly the three GB-01 evidence files and the Claude GB-01 review as untracked files.

GB-02A committed and pushed those files in `2e8c3821f42a1ffdb138fce530981ec6012feffc`. Claude reviewed that head and returned `REQUEST CHANGES` for GB2-01. GB-02A-C1 remains on the same branch and PR #2.

### B. Files preserved

These raw/pre-existing artifacts remain tracked without factual raw-output edits:

- `implementation/evidence/3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0/gate-b/GATE_B_VERIFICATION.md`
- `implementation/evidence/3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0/gate-b/commands.log`
- `implementation/evidence/3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0/gate-b/environment.txt`
- `planning/implementation/reviews/gb-01/CLAUDE_GB01_REVIEW.md`
- `planning/implementation/reviews/gb-02/CLAUDE_GB02A_REVIEW.md`

GB-02A-C1 does not rewrite `commands.log` or `environment.txt`.

### C. Evidence policy

`implementation/evidence/README.md` makes the evidence root intentionally tracked and defines tested-SHA semantics, required evidence metadata, immutable storage, redaction, and append-only rerun governance.

GB2-03 privacy decision:

- future sanitized evidence replaces local username/home-directory segments with `<LOCAL_USER>` or `<USER_HOME>`;
- raw evidence never contains secrets, tokens, credentials, full PII, or production credentials;
- GB-01 contains four local Docker Desktop path occurrences;
- those four occurrences are retained unchanged to preserve raw-evidence integrity;
- review confirmed that the paths contain no secret, token, or credential.

### D. `.gitignore` policy

The root `.gitignore` covers dependencies, pnpm cache, build output, coverage, local environment files, editor/OS files, transient caches, non-evidence logs, Docker/local database state, secrets, credentials, and private keys.

It does not ignore evidence, reviews, manifests, verification scripts, or workflows.

### E. Plan-history manifest

The source is commit `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd` (`add_doc`, 2026-07-25T20:41:41+07:00).

Required inventory:

| Directory | Files |
|---|---:|
| `planning/implementation/v0.1/` | 12 |
| `planning/implementation/v0.2/` | 15 |
| `planning/implementation/v0.3/` | 16 |
| `planning/implementation/v0.4/` | 18 |
| `planning/implementation/v0.4.1/` | 19 |
| **Total** | **80** |

The corrected manifest hashes exact content bytes stored in the 80 Git blobs. Inventory comes from NUL-delimited `git ls-tree -r -z --full-tree`; each mode/type/OID/path is parsed; non-blob entries are rejected; each hash is computed directly from `git cat-file blob <blob_oid>`.

The manifest uses SHA-256, original repository-relative paths, stable ordinal/bytewise lexicographic path order, no timestamp lines, no duplicate path, and no entry outside the five directories.

### F. Manifest verification and correction history

Defect reproduction for the first file:

| Field | Value |
|---|---|
| Path | `planning/implementation/v0.1/00_IMPLEMENTATION_PLAN_OVERVIEW.md` |
| Blob OID | `150895657f03efce74c504f107b9aec035b4ab6b` |
| Exact blob SHA-256 | `27b9fea8fd8f57658e9b19f750e977fd06fbb2599749c27666a95a4d3a29e917` |
| Prior archive/export SHA-256 | `800607c49aaa4cbd81b020046f409c26f6ac43b6f09980ed7e2c78a659b13721` |
| Prior manifest SHA-256 | `800607c49aaa4cbd81b020046f409c26f6ac43b6f09980ed7e2c78a659b13721` |
| `core.autocrlf` origin/value | `file:C:/Program Files/Git/etc/gitconfig` / `true` |

The first implementation in `2e8c3821f42a1ffdb138fce530981ec6012feffc` used `git archive`, extracted the archive, and hashed exported bytes. System `core.autocrlf=true` produced CRLF content, so the old manifest was platform/config dependent. This correction does not hide that history.

Corrected implementation:

- PowerShell uses `System.Diagnostics.ProcessStartInfo`, hashes `StandardOutput.BaseStream` directly with `SHA256.ComputeHash()`, and checks every `cat-file` exit code.
- POSIX uses `git cat-file blob "$blob_oid" | sha256sum` with `set -euo pipefail`.
- Neither implementation hashes archive, checkout, restored, or working-tree content.
- No historical commit or file was rewritten.

Final local results:

- corrected first manifest hash equals the exact blob hash `27b9fea8…`;
- PowerShell verifier: PASS, 80 manifest entries, 80 tree paths, zero missing/extra/duplicate/mismatch;
- Bash verifier: PASS, 80/80, zero missing/extra/duplicate/mismatch;
- PowerShell generator and Bash generator produce byte-identical manifests;
- generated/committed manifest file SHA-256: `4dd615b26933af7617bcb9249acc5bca44df78d913ae740a2e539b98c0e22ebf`;
- v1.0 manifest remains PASS, 20/20;
- v1.0 artifact inventory remains 21 files;
- active v0.x directory count remains zero.

Cross-config result:

- `core.autocrlf=true`: generator exit 0, verifier exit 0;
- `core.autocrlf=false`: generator exit 0, verifier exit 0;
- both generated hash sets are byte-identical and match the committed manifest.

`core.autocrlf` does not affect `git cat-file blob` bytes.

Negative tests used temporary manifest copies only:

| Case | Exit | Expected |
|---|---:|---|
| Change one hash | 1 | FAIL |
| Remove one entry | 1 | FAIL |
| Add one fake entry | 1 | FAIL |
| Duplicate one path | 1 | FAIL |
| Swap first two entries | 1 | FAIL |

All temporary test directories were removed.

### G. Tag proposal

`TAG_PROPOSAL.md` records without creating:

1. `docs-v1.2.1-approved` → `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`;
2. `planning-history-v0.1-v0.4.1` → `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`;
3. `implementation-plan-v1.0-approved` → `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0`.

All tags still require explicit user/maintainer authorization. None is created by GB-02A or GB-02A-C1.

### H. Minimal CI workflow

`.github/workflows/gate-b-baseline.yml`:

- runs on pull requests and manual dispatch;
- grants only read access to contents;
- checks out full history and tags;
- verifies v1.0 manifest 20/20;
- invokes the corrected exact-blob Bash verifier, which reports 80/80;
- checks exact v1.0 inventory, absence of active v0.x directories, Approved docs, and evidence policy;
- writes and uploads a sanitized report artifact;
- never uses `git archive` as a hash source and does not depend on checkout line endings or `core.autocrlf`;
- does not run Node, pnpm, application build, Docker, PostgreSQL, or migrations.

Remote run ID, URL, conclusion, and artifact identity are recorded in PR #2 after the corrected commit is pushed. This repository report is not amended solely to store that remote run identity.

### I. Files changed

The cumulative PR diff contains:

1. `.gitignore`
2. `.github/workflows/gate-b-baseline.yml`
3. `implementation/evidence/README.md`
4. three GB-01 Gate B evidence files
5. `planning/implementation/history/PLAN_HISTORY_PROVENANCE.md`
6. `planning/implementation/history/PLAN_HISTORY_MANIFEST.sha256`
7. `planning/implementation/history/generate-plan-history-manifest.ps1`
8. `planning/implementation/history/generate-plan-history-manifest.sh`
9. `planning/implementation/history/verify-plan-history.ps1`
10. `planning/implementation/history/verify-plan-history.sh`
11. `planning/implementation/history/TAG_PROPOSAL.md`
12. Claude GB-01 and GB-02A reviews
13. this GB-02A remediation report

No file under `doc/` or `planning/implementation/v1.0/` changed.

### J. Commands and exit codes

| Command/check | Exit | Result |
|---|---:|---|
| exact `ls-tree` first-file lookup | 0 | Blob `150895657f03efce74c504f107b9aec035b4ab6b` |
| binary-safe first blob hash | 0 | `27b9fea8…` |
| prior archive/export reproduction | 0 | `800607c4…`, matching old manifest |
| PowerShell exact-blob generator | 0 | PASS 80 entries |
| PowerShell exact-blob verifier | 0 | PASS 80/80 |
| Bash exact-blob generator | 0 | Byte-identical to committed manifest |
| Bash exact-blob verifier | 0 | PASS 80/80 |
| cross-`autocrlf` true/false test | 0 | PASS; identical hash sets |
| five negative verifier cases | 1 each | All failed as required |
| v1.0 SHA-256 verification | 0 | PASS 20/20 |
| protected path diff checks | 0 | Empty |
| local/remote tag checks | 0 | No tags |

No Git configuration file was modified. The `core.autocrlf` cross-tests used process-scoped environment overrides only.

### K. Remaining blockers

GB-02A-C1 does not resolve:

1. explicit authorization, creation, push, and exact local/remote target verification for proposed tags;
2. pinned pnpm activation and verification;
3. Docker engine availability;
4. PostgreSQL 16 image/runtime verification;
5. a clean-main Gate B rerun after authorized remediation.

Remote CI is a correction acceptance condition. Its immutable run/artifact evidence is recorded in PR #2 rather than by creating another repository commit solely for the run ID.

### L. Verdict

**GB-02A LOCAL CORRECTION COMPLETE — REMOTE CI REQUIRED**

The repository artifacts are locally ready for the corrected CI run. Final `GB-02A CORRECTION READY FOR CLAUDE RE-REVIEW` status is asserted only after the new PR head workflow succeeds and its run/artifact identity is recorded in PR #2. Gate B remains NOT PASSED and P0 remains unauthorized.
