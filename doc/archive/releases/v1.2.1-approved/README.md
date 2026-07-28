# Release snapshot — documentation v1.2.1 (Approved)

This directory used to hold a byte-for-byte copy of the eleven Approved design
documents `00`–`10`. Those copies were removed on 2026-07-29: they were identical
to `doc/*.md` and the freeze they provided is already guaranteed, more reliably,
by the annotated Git tag `docs-v1.2.1-approved`.

`RELEASE_MANIFEST.md` is retained. It records the size and SHA-256 of each of the
eleven documents at the moment of approval, so the freeze stays verifiable without
depending on the copies.

## Verify the current documents against the approved release

```bash
# From the repository root
sha256sum doc/0*.md doc/10_*.md
# Compare against the values in RELEASE_MANIFEST.md
```

While `doc/*.md` remains at v1.2.1, every hash must match. A mismatch means the
Approved set has drifted and needs an explicit version bump, not a silent edit.

## Recover the removed snapshot copies

```bash
git show docs-v1.2.1-approved:doc/archive/releases/v1.2.1-approved/05_DATABASE_SCHEMA_POSTGRESQL.md
```

Cross-checks for this snapshot and for the legacy v1.1/v1.2 ZIP are recorded in
`doc/archive/CLEANUP_REPORT.md`.
