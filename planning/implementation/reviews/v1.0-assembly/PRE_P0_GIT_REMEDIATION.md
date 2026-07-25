# PRE-P0 GIT REMEDIATION — READ-ONLY FINDING AND USER OPTIONS

**Inspection date:** 2026-07-25  
**Inspection mode:** READ-ONLY  
**Gate A:** PASSED  
**Gate B:** NOT MET

## 1. Current Git state

The project root contains a `.git` directory, but the directory is empty and is not valid Git metadata.

Read-only commands executed:

| Command | Exit | Result |
|---|---:|---|
| `git status --short --branch` | 128 | `fatal: not a git repository` |
| `git rev-parse --show-toplevel` | 128 | same |
| `git remote -v` | 128 | same |
| `git branch --show-current` | 128 | same |
| `git log -1 --oneline` | 128 | same |
| `git tag --list docs-v1.2.1-approved` | 128 | same |

Therefore repository root, `main`, remote/no-remote decision, baseline commit, status and tag cannot be verified. This is the current explicit Gate B blocker.

No `git init`, clone, remote mutation, add, commit, tag, reset or `.git` deletion was performed.

## 2. Option A — Restore or clone the original repository

Use this option if an original repository exists or prior history must be preserved.

Authorized operator workflow, only after the user supplies/approves the source:

1. Identify the authoritative original repository URL or recoverable backup.
2. Preserve the current workspace and empty `.git` state until the recovery procedure is approved.
3. Restore/clone the correct repository without overwriting uncommitted workspace artifacts.
4. Reconcile the approved documents and v1.0 artifacts into the recovered working tree.
5. Verify root, `main`, remote, history, clean/known status, baseline commit and tag `docs-v1.2.1-approved`.
6. Create the plan-history hash manifest, commit historical files unchanged and retain an archive/tag reference without rewriting history.

Option A is preferred when an original repository or required history exists.

## 3. Option B — User-approved new repository initialization

Use this option only if no original repository exists or the user explicitly decides old Git history is not recoverable/required.

Authorized operator workflow after explicit approval:

1. Record the decision that a new repository is authoritative.
2. Resolve the empty `.git` directory under an approved, recoverable procedure.
3. Initialize the repository at the confirmed project root.
4. Create/confirm `main`.
5. Configure the approved remote, or record an explicit no-remote decision.
6. Define the exact initial baseline commit scope.
7. Commit the approved baseline and plan history without rewriting file content.
8. Create and verify tag `docs-v1.2.1-approved`.

This report does not authorize or execute Option B.

## 4. User decisions required

Before an authorized operator acts, the user must decide/provide:

- whether an original repository URL or backup exists;
- whether prior Git history must be preserved;
- the authoritative remote destination, if any;
- the required main branch name (`main` unless explicitly changed);
- remote versus explicit no-remote operation;
- the exact scope of the initial/recovered baseline commit;
- who is authorized to perform the restoration/initialization.

## 5. Gate B re-verification

After the selected option is completed, Gate B must independently verify:

- valid repository root;
- current branch `main`;
- remote or documented no-remote decision;
- baseline commit and known working-tree status;
- tag `docs-v1.2.1-approved`;
- plan-history hash manifest and unchanged-history evidence;
- supported Node/pnpm toolchain;
- Docker and PostgreSQL 16 availability;
- CI/evidence path;
- P0 DoR including the exact spike plan.

No coding or P0 start is authorized before this re-verification passes.
