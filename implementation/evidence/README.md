# Implementation Evidence Policy

`implementation/evidence/` is intentionally tracked in Git.

## Path convention

Evidence uses this path format:

```text
implementation/evidence/<tested_commit_sha>/<gate-or-phase>/
```

`<tested_commit_sha>` identifies the commit whose behavior, state, or artifacts were tested. Evidence may be committed later in a separate evidence commit. The subject SHA therefore does not imply that the subject commit already contains the evidence files.

## PASS and preservation rule

A Gate or phase cannot claim PASS until one of these conditions is met:

1. its raw evidence is committed and pushed; or
2. an immutable CI artifact URL and run ID are recorded in tracked evidence.

Every evidence package must include:

- tested commit SHA;
- environment and relevant tool versions;
- commands;
- raw stdout and stderr;
- exit code;
- start and end timestamps;
- mutation ledger.

Evidence must not contain secrets, tokens, credentials, full personally identifiable information, production credentials, or unredacted sensitive payloads.

Future sanitized evidence must replace local username or home-directory segments with `<LOCAL_USER>` or `<USER_HOME>`.

The existing GB-01 evidence contains four occurrences of a local Docker Desktop executable path whose user-home segment identifies the local OS account. Those four occurrences are retained unchanged to preserve raw-evidence integrity. They were reviewed and contain no secret, token, credential, or full PII payload. This is a governed historical exception and is not a precedent for future evidence.

Large, binary, or transient artifacts belong in immutable CI artifact storage. Git stores their manifest, immutable link or run ID, checksum, and a sanitized result summary.

A rerun creates a new evidence directory or an explicit revision. It never silently overwrites historical evidence.
