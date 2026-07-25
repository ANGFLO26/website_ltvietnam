# GB-02A — Governance and Evidence Remediation

Review date: 2026-07-25  
Repository: `https://github.com/ANGFLO26/website_ltvietnam.git`  
Task branch: `chore/gb-01-gate-b-verification`  
Task base: `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0`

GB-02A resolves Git governance, evidence preservation, plan-history provenance, remote tag inspection, ignore policy, and minimal Gate B CI. It does not claim Gate B PASS.

### A. Source state

Before mutation:

- current branch was `chore/gb-01-gate-b-verification`;
- `HEAD`, `main`, and `origin/main` all resolved to `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0`;
- remote `origin` fetch/push URL was `https://github.com/ANGFLO26/website_ltvietnam.git`;
- remote heads were `main` and `chore/cleanup-planning-readme`;
- `git ls-remote --tags origin` returned no tags;
- the working tree contained exactly the three GB-01 evidence files and the Claude GB-01 review as untracked files;
- no unrelated tracked modification or untracked file existed.

The branch had no unique commit and no upstream before GB-02A.

### B. Files preserved

The following pre-existing untracked artifacts are retained without factual raw-output edits:

- `implementation/evidence/3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0/gate-b/GATE_B_VERIFICATION.md`
- `implementation/evidence/3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0/gate-b/commands.log`
- `implementation/evidence/3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0/gate-b/environment.txt`
- `planning/implementation/reviews/gb-01/CLAUDE_GB01_REVIEW.md`

Recorded SHA-256 values:

| File | SHA-256 |
|---|---|
| `GATE_B_VERIFICATION.md` | `ba32bd54245ccf5a86a7681b17d3049232498ae0c0b49d714420fe441173ceae` |
| `commands.log` | `a228c2e59e6949f905e5ae6b54246019b1363abfe8b9f1d5650cf7d5a277f77a` |
| `environment.txt` | `fccac63eec0dc11d56ebdf12d85ff5e4a70c4e573c59af28c0af043fddcc7ae9` |
| `CLAUDE_GB01_REVIEW.md` | `ccd4a83a13292d529b36d3a0702963bdcdd95cb9569bc6a663ea9041e69a05d3` |

Their later evidence commit does not change the meaning of the tested subject SHA.

### C. Evidence policy

`implementation/evidence/README.md` makes the evidence root intentionally tracked and defines:

- the `<tested_commit_sha>/<gate-or-phase>/` convention;
- the distinction between evidence subject and later evidence commit;
- committed-and-pushed evidence or immutable CI artifact identity as a PASS prerequisite;
- required command, stream, timestamp, environment, exit-code, and mutation metadata;
- secret/PII restrictions;
- CI storage for large/binary/transient artifacts;
- append-only rerun governance.

This closes GB-R01's preservation ambiguity and GB-R04's missing evidence policy.

### D. `.gitignore` policy

The root `.gitignore` covers dependencies, pnpm cache, build output, coverage, local environment files, editor/OS files, transient caches, non-evidence logs, Docker/local database state, secrets, credentials, and private keys.

It explicitly does not ignore:

- `implementation/evidence/`;
- `planning/implementation/reviews/`;
- manifest files;
- verification scripts;
- `.github/workflows/`.

Rule probes confirmed that representative dependency, build, environment, log, volume, and credential paths are ignored while evidence logs, reviews, and workflows remain trackable.

### E. Plan-history manifest

The source is commit `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd` (`add_doc`, 2026-07-25T20:41:41+07:00).

`PLAN_HISTORY_MANIFEST.sha256` hashes exact Git-object bytes for:

| Directory | Files |
|---|---:|
| `planning/implementation/v0.1/` | 12 |
| `planning/implementation/v0.2/` | 15 |
| `planning/implementation/v0.3/` | 16 |
| `planning/implementation/v0.4/` | 18 |
| `planning/implementation/v0.4.1/` | 19 |
| **Total** | **80** |

The manifest uses SHA-256, original repository-relative paths, stable ordinal lexicographic path order, no timestamp lines, no duplicate path, and no entry outside the five directories.

Generation used `git archive` to a temporary tar, extracted exact bytes, hashed extracted files, and removed only the generated temporary directory. No historical directory was checked out or restored into the active tree.

### F. Manifest verification

Final verification:

- PowerShell verifier: `PASS`, 80 manifest entries, 80 archived files, exit 0.
- Bash verifier via Git for Windows: `PASS`, 80 manifest entries, 80 archived files, exit 0.
- v1.0 manifest: `PASS`, 20/20 entries, exit 0.
- v1.0 exact artifact inventory: `PASS`, 21 files, exit 0.
- active v0.x directory check: `PASS`, count 0, exit 0.

An initial draft of the Bash verifier sorted full hash lines rather than paths and correctly failed its ordering check. The verifier was corrected to sort extracted path fields; both independent implementations then passed against the same 80 exact Git objects.

The scripts reject malformed, duplicate, out-of-order, out-of-scope, missing, extra, or hash-mismatched entries.

### G. Tag proposal

`TAG_PROPOSAL.md` records without creating:

1. `docs-v1.2.1-approved` → `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`;
2. `planning-history-v0.1-v0.4.1` → `9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd`;
3. `implementation-plan-v1.0-approved` → `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0`.

The record distinguishes the v1.0-mandated docs tag, the plan-history retained-reference tag, and the deliberate project-governance name for the v1.0 baseline tag. Every tag still requires explicit user/maintainer authorization. GB-02B must verify both local and remote tag refs and exact targets.

This addresses GB-R03's local-only tag inspection and GB-R05's tag-name framing.

### H. Minimal CI workflow

`.github/workflows/gate-b-baseline.yml`:

- runs on pull requests and manual dispatch;
- grants only read access to contents;
- checks out full history and tags;
- verifies the approved v1.0 manifest;
- verifies the 80-file plan-history manifest against source Git objects;
- checks exact v1.0 inventory;
- rejects active v0.x directories;
- confirms Approved docs and evidence policy are present;
- writes a sanitized run report with workflow metadata, tested commit, commands, results, and manifest counts;
- uploads the report with `actions/upload-artifact@v4`;
- uses `actions/checkout@v4`;
- does not run Node, pnpm, application build, Docker, PostgreSQL, or migrations.

Local basic structural validation passed: no tab indentation, even indentation, required workflow keys/triggers/permissions/actions/checks present, balanced GitHub expressions, expected here-document closure, and exactly two supported action references.

### I. Files changed

Files in GB-02A scope:

1. `.gitignore`
2. `.github/workflows/gate-b-baseline.yml`
3. `implementation/evidence/README.md`
4. `implementation/evidence/3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0/gate-b/GATE_B_VERIFICATION.md`
5. `implementation/evidence/3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0/gate-b/commands.log`
6. `implementation/evidence/3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0/gate-b/environment.txt`
7. `planning/implementation/history/PLAN_HISTORY_PROVENANCE.md`
8. `planning/implementation/history/PLAN_HISTORY_MANIFEST.sha256`
9. `planning/implementation/history/verify-plan-history.ps1`
10. `planning/implementation/history/verify-plan-history.sh`
11. `planning/implementation/history/TAG_PROPOSAL.md`
12. `planning/implementation/reviews/gb-01/CLAUDE_GB01_REVIEW.md`
13. `planning/implementation/reviews/gb-02/GB02A_GOVERNANCE_REMEDIATION.md`

No file under `doc/` or `planning/implementation/v1.0/` changed.

### J. Commands and exit codes

| Command/check | Exit | Result |
|---|---:|---|
| `git status --short --branch` | 0 | Correct branch; four expected untracked artifacts |
| `git rev-parse HEAD/main/origin/main` | 0 | All `3794cafdeb53fc350c0cdf9cb868f0264c2fc4b0` |
| `git ls-remote --heads origin` | 0 | Two pre-task remote branches |
| `git ls-remote --tags origin` | 0 | No remote tags |
| `powershell ... verify-plan-history.ps1` | 0 | PASS 80/80 |
| `Git\bin\bash.exe ... verify-plan-history.sh` | 0 | PASS 80/80 after verifier correction |
| v1.0 SHA-256 verification | 0 | PASS 20/20 |
| v1.0 exact inventory check | 0 | PASS 21 files |
| active v0.x directory check | 0 | PASS, zero |
| Approved docs/evidence policy check | 0 | PASS, 13 required files |
| CI workflow basic structural validation | 0 | PASS, 172 lines and two supported actions |
| `git diff <base> -- doc` | 0 | Empty |
| `git diff <base> -- planning/implementation/v1.0` | 0 | Empty |
| source/migration SQL scope check | 0 | PASS, none added |
| `git tag --list` | 0 | Empty; no local tag created |

The GitHub CLI was not installed. No tool was installed to compensate; PR creation uses the connected GitHub integration after the branch push.

### K. Remaining blockers

GB-02A does not resolve or claim resolution of:

1. explicit authorization, creation, push, and local/remote target verification for the three proposed tags;
2. pinned pnpm activation and verification;
3. Docker engine availability;
4. PostgreSQL 16 image/runtime verification;
5. successful remote execution and immutable run/artifact identity for the new CI workflow;
6. a clean-main Gate B rerun after authorized governance/environment remediation.

GB-R06 is clarified here: GB-01's clean `main` state was a timestamped pre-evidence observation, not the later branch state.

### L. Verdict

**GB-02A READY FOR INDEPENDENT REVIEW**

This is a GB-02A governance-remediation verdict only. Gate B remains NOT PASSED, P0 remains unauthorized, and no tag, dependency, Docker state, database, Approved document, or v1.0 baseline content was changed.
